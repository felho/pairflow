import { isNamedError } from "../../shared/errors/namedError.js";
import {
  type ExecuteRemoteBubbleMergeCommandResult,
  type MergeBubbleResult
} from "./mergeCommandContract.js";
import { buildMergeBubbleResult } from "./mergeResultMapping.js";
import type { ResolvedMergeCommandDependencies } from "./mergeCommandDependencyResolution.js";
import {
  ensureOriginRemote,
  hasOriginRemoteError,
  remoteBranchExists
} from "../../shared/merge/mergeRoutingEligibility.js";
import { initializeMergeFlowExecutionContext } from "./mergeFlowContext.js";
import { finalizeMergeFlow } from "./mergeFlowFinalization.js";
import type { RunMergeFlowInput } from "./mergeFlowTypes.js";

const MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION =
  "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION";
const MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE =
  "MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE";
const MERGE_REMOTE_DELETE_FAILED = "MERGE_REMOTE_DELETE_FAILED";
const MERGE_BASE_BRANCH_PUSH_FAILED = "MERGE_BASE_BRANCH_PUSH_FAILED";
const MERGE_REMOTE_HANDOFF_INVALID = "MERGE_REMOTE_HANDOFF_INVALID";
const MERGE_REMOTE_IMPORT_FAILED = "MERGE_REMOTE_IMPORT_FAILED";
const MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED =
  "MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED";

async function mergeRevisionIntoBase(input: {
  repoPath: string;
  baseBranch: string;
  mergeRevision: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeFlowInput["createError"];
}): Promise<string> {
  await input.runGit(["checkout", input.baseBranch], {
    cwd: input.repoPath
  });

  try {
    await input.runGit(["merge", "--no-ff", "--no-edit", input.mergeRevision], {
      cwd: input.repoPath
    });
  } catch (error) {
    await input.runGit(["merge", "--abort"], {
      cwd: input.repoPath,
      allowFailure: true
    }).catch(() => undefined);
    if (isNamedError(error, "GitCommandError")) {
      throw input.createError({
        reasonCode: MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION,
        message:
          `Merge failed for ${input.bubbleBranch} -> ${input.baseBranch}. Resolve conflicts manually.`,
        context: {
          command_name: "merge",
          bubble_branch: input.bubbleBranch,
          base_branch: input.baseBranch
        },
        cause: error
      });
    }
    throw error;
  }

  return (
    await input.runGit(["rev-parse", "HEAD"], {
      cwd: input.repoPath
    })
  ).stdout.trim();
}

async function runMergeRemoteOperations(input: {
  push: boolean;
  deleteRemote: boolean;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeFlowInput["createError"];
}): Promise<{ pushedBaseBranch: boolean; deletedRemoteBranch: boolean }> {
  let pushedBaseBranch = false;
  let deletedRemoteBranch = false;

  if (input.push || input.deleteRemote) {
    await ensureOriginRemote(input.repoPath, input.runGit, input.createError);
  }
  if (input.push) {
    try {
      await input.runGit(["push", "origin", input.baseBranch], {
        cwd: input.repoPath
      });
      pushedBaseBranch = true;
    } catch (error) {
      if (isNamedError(error, "GitCommandError")) {
        throw input.createError({
          reasonCode: MERGE_BASE_BRANCH_PUSH_FAILED,
          message:
            `Failed to publish merged base branch ${input.baseBranch} to origin.`,
          context: {
            command_name: "merge",
            base_branch: input.baseBranch,
            bubble_branch: input.bubbleBranch
          },
          cause: error
        });
      }
      throw error;
    }
  }

  if (!input.deleteRemote) {
    return { pushedBaseBranch, deletedRemoteBranch };
  }

  if (
    await remoteBranchExists({
      repoPath: input.repoPath,
      branch: input.bubbleBranch,
      runGitCommand: input.runGit
    })
  ) {
    const remoteDelete = await input.runGit(
      ["push", "origin", "--delete", input.bubbleBranch],
      {
        cwd: input.repoPath,
        allowFailure: true
      }
    );
    if (remoteDelete.exitCode !== 0) {
      if (hasOriginRemoteError(remoteDelete.stderr)) {
        throw input.createError({
          reasonCode: MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE,
          message:
            `Failed to delete remote branch ${input.bubbleBranch}: origin remote is not available.`,
          context: {
            command_name: "merge",
            bubble_branch: input.bubbleBranch
          },
          cause: remoteDelete.stderr
        });
      }
      throw input.createError({
        reasonCode: MERGE_REMOTE_DELETE_FAILED,
        message:
          `Failed to delete remote branch ${input.bubbleBranch}: ${remoteDelete.stderr.trim()}`,
        context: {
          command_name: "merge",
          bubble_branch: input.bubbleBranch
        },
        cause: remoteDelete.stderr
      });
    }
    deletedRemoteBranch = true;
  }

  return { pushedBaseBranch, deletedRemoteBranch };
}

function buildRemoteCloneGitUrl(input: {
  host: string;
  user?: string;
  remoteClonePath: string;
}): string {
  const authority = input.user !== undefined ? `${input.user}@${input.host}` : input.host;
  const path = input.remoteClonePath.startsWith("/")
    ? input.remoteClonePath
    : `/${input.remoteClonePath}`;
  const encodedPath = path
    .split("/")
    .map((segment, index) =>
      index === 0 && segment.length === 0 ? "" : encodeURIComponent(segment)
    )
    .join("/");
  return `ssh://${authority}${encodedPath}`;
}

function isRemoteMergeImportSource(
  value: unknown
): value is ExecuteRemoteBubbleMergeCommandResult["importSource"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.kind === "git_ref"
    && typeof candidate.ref === "string"
    && candidate.ref.trim().length > 0
    && typeof candidate.commitSha === "string"
    && candidate.commitSha.trim().length > 0
  );
}

async function importRemoteMergeHandoff(input: {
  context: Extract<Awaited<ReturnType<typeof initializeMergeFlowExecutionContext>>, { route: "remote" }>;
  remoteResult: ExecuteRemoteBubbleMergeCommandResult;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeFlowInput["createError"];
}): Promise<string> {
  if (!isRemoteMergeImportSource(input.remoteResult.importSource)) {
    throw input.createError({
      reasonCode: MERGE_REMOTE_HANDOFF_INVALID,
      message:
        `Remote merge handoff import source is invalid for ${input.context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId
      }
    });
  }

  const importSource = input.remoteResult.importSource;

  if (input.remoteResult.baseBranch !== input.context.baseBranch) {
    throw input.createError({
      reasonCode: MERGE_REMOTE_HANDOFF_INVALID,
      message:
        `Remote merge handoff base branch mismatch for ${input.context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId,
        expected_base_branch: input.context.baseBranch,
        actual_base_branch: input.remoteResult.baseBranch
      }
    });
  }
  if (input.remoteResult.bubbleBranch !== input.context.bubbleBranch) {
    throw input.createError({
      reasonCode: MERGE_REMOTE_HANDOFF_INVALID,
      message:
        `Remote merge handoff bubble branch mismatch for ${input.context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId,
        expected_bubble_branch: input.context.bubbleBranch,
        actual_bubble_branch: input.remoteResult.bubbleBranch
      }
    });
  }
  if (input.remoteResult.cleanupPending !== true) {
    throw input.createError({
      reasonCode: MERGE_REMOTE_HANDOFF_INVALID,
      message:
        `Remote merge handoff for ${input.context.resolved.bubbleId} must remain pre-cleanup.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId
      }
    });
  }
  if (importSource.ref !== input.context.localImportRef) {
    throw input.createError({
      reasonCode: MERGE_REMOTE_HANDOFF_INVALID,
      message:
        `Remote merge handoff ref mismatch for ${input.context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId,
        expected_import_ref: input.context.localImportRef,
        actual_import_ref: importSource.ref
      }
    });
  }

  const remoteGitUrl = buildRemoteCloneGitUrl({
    host: input.context.remoteTarget.host,
    ...(input.context.remoteTarget.user !== undefined
      ? { user: input.context.remoteTarget.user }
      : {}),
    remoteClonePath: input.context.remotePointer.remoteClonePath
  });

  try {
    await input.runGit(
      [
        "fetch",
        "--no-tags",
        remoteGitUrl,
        `${importSource.ref}:${input.context.localImportRef}`
      ],
      {
        cwd: input.context.repoPath
      }
    );
  } catch (error) {
    if (isNamedError(error, "GitCommandError")) {
      throw input.createError({
        reasonCode: MERGE_REMOTE_IMPORT_FAILED,
        message:
          `Failed to import remote merge handoff for ${input.context.resolved.bubbleId}.`,
        context: {
          command_name: "merge",
          bubble_id: input.context.resolved.bubbleId,
          import_source_ref: importSource.ref,
          local_import_ref: input.context.localImportRef,
          remote_clone_path: input.context.remotePointer.remoteClonePath
        },
        cause: error
      });
    }
    throw error;
  }

  let importedCommitSha: string;
  try {
    importedCommitSha = (
      await input.runGit(["rev-parse", `${input.context.localImportRef}^{commit}`], {
        cwd: input.context.repoPath
      })
    ).stdout.trim();
  } catch (error) {
    if (isNamedError(error, "GitCommandError")) {
      throw input.createError({
        reasonCode: MERGE_REMOTE_IMPORT_FAILED,
        message:
          `Failed to resolve imported remote merge handoff for ${input.context.resolved.bubbleId}.`,
        context: {
          command_name: "merge",
          bubble_id: input.context.resolved.bubbleId,
          local_import_ref: input.context.localImportRef,
          remote_clone_path: input.context.remotePointer.remoteClonePath
        },
        cause: error
      });
    }
    throw error;
  }

  if (importedCommitSha !== importSource.commitSha) {
    throw input.createError({
      reasonCode: MERGE_REMOTE_HANDOFF_INVALID,
      message:
        `Remote merge handoff commit mismatch for ${input.context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId,
        expected_commit_sha: importSource.commitSha,
        actual_commit_sha: importedCommitSha,
        local_import_ref: input.context.localImportRef
      }
    });
  }

  return input.context.localImportRef;
}

export async function runMergeFlow(
  input: RunMergeFlowInput,
  dependencies: ResolvedMergeCommandDependencies
): Promise<MergeBubbleResult> {
  const context = await initializeMergeFlowExecutionContext({
    params: input,
    dependencies
  });

  if (context.route === "remote") {
    if (input.push || input.deleteRemote) {
      throw input.createError({
        reasonCode: MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED,
        message:
          `Started-remote merge for '${context.resolved.bubbleId}' does not support --push or --delete-remote in pre-cleanup handoff mode.`,
        context: {
          command_name: "merge",
          bubble_id: context.resolved.bubbleId,
          push_requested: input.push,
          delete_remote_requested: input.deleteRemote
        }
      });
    }

    const remoteResult = await dependencies.executeRemoteBubbleMergeCommand({
      bubbleId: context.resolved.bubbleId,
      remoteClonePath: context.remotePointer.remoteClonePath,
      remoteTarget: context.remoteTarget,
      baseBranch: context.baseBranch,
      bubbleBranch: context.bubbleBranch,
      tmuxSessionName: context.remotePointer.tmuxSession
    });
    const importedRevision = await importRemoteMergeHandoff({
      context,
      remoteResult,
      runGit: dependencies.runGit,
      createError: input.createError
    });
    const mergeCommitSha = await mergeRevisionIntoBase({
      repoPath: context.repoPath,
      baseBranch: context.baseBranch,
      mergeRevision: importedRevision,
      bubbleBranch: context.bubbleBranch,
      runGit: dependencies.runGit,
      createError: input.createError
    });

    const finalization = await finalizeMergeFlow({
      params: input,
      context,
      dependencies,
      mergeCommitSha,
      pushedBaseBranch: false,
      deletedRemoteBranch: false
    });

    return buildMergeBubbleResult({
      bubbleId: context.resolved.bubbleId,
      baseBranch: context.baseBranch,
      bubbleBranch: context.bubbleBranch,
      mergeCommitSha,
      presentationRoute: "started_remote",
      pushedBaseBranch: false,
      deletedRemoteBranch: false,
      cleanupOutcome: finalization.cleanupOutcome
    });
  }

  const mergeCommitSha = await mergeRevisionIntoBase({
    repoPath: context.repoPath,
    baseBranch: context.baseBranch,
    mergeRevision: context.bubbleBranch,
    bubbleBranch: context.bubbleBranch,
    runGit: dependencies.runGit,
    createError: input.createError
  });

  const { pushedBaseBranch, deletedRemoteBranch } =
    await runMergeRemoteOperations({
      push: input.push,
      deleteRemote: input.deleteRemote,
      repoPath: context.repoPath,
      baseBranch: context.baseBranch,
      bubbleBranch: context.bubbleBranch,
      runGit: dependencies.runGit,
      createError: input.createError
    });

  const finalization = await finalizeMergeFlow({
    params: input,
    context,
    dependencies,
    mergeCommitSha,
    pushedBaseBranch,
    deletedRemoteBranch
  });

  return buildMergeBubbleResult({
    bubbleId: context.resolved.bubbleId,
    baseBranch: context.baseBranch,
    bubbleBranch: context.bubbleBranch,
    mergeCommitSha,
    presentationRoute: "local",
    pushedBaseBranch,
    deletedRemoteBranch,
    cleanupOutcome: finalization.cleanupOutcome
  });
}
