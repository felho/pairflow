import { isNamedError } from "../../../../shared/errors/namedError.js";
import type {
  ExecuteRemoteBubbleMergeCommandResult,
  RunMergeCommandPipelineInput
} from "../../mergeCommandContract.js";
import type { ResolvedMergeCommandDependencies } from "../../mergeCommandDependencyResolution.js";
import type { RemoteMergeFlowExecutionContext } from "../../mergeFlowContext.js";

const MERGE_REMOTE_HANDOFF_INVALID = "MERGE_REMOTE_HANDOFF_INVALID";
const MERGE_REMOTE_IMPORT_FAILED = "MERGE_REMOTE_IMPORT_FAILED";

function buildStartedRemoteCloneGitUrl(input: {
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

function isStartedRemoteMergeGitRefSource(
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

function requireMatchingStartedRemoteHandoff(input: {
  context: RemoteMergeFlowExecutionContext;
  remoteResult: ExecuteRemoteBubbleMergeCommandResult;
  createError: RunMergeCommandPipelineInput["createError"];
}): ExecuteRemoteBubbleMergeCommandResult["importSource"] {
  if (!isStartedRemoteMergeGitRefSource(input.remoteResult.importSource)) {
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
  return importSource;
}

async function fetchStartedRemoteHandoffRef(input: {
  context: RemoteMergeFlowExecutionContext;
  importSource: ExecuteRemoteBubbleMergeCommandResult["importSource"];
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeCommandPipelineInput["createError"];
}): Promise<void> {
  const remoteGitUrl = buildStartedRemoteCloneGitUrl({
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
        `${input.importSource.ref}:${input.context.localImportRef}`
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
          import_source_ref: input.importSource.ref,
          local_import_ref: input.context.localImportRef,
          remote_clone_path: input.context.remotePointer.remoteClonePath
        },
        cause: error
      });
    }
    throw error;
  }
}

async function resolveStartedRemoteImportedCommit(input: {
  context: RemoteMergeFlowExecutionContext;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeCommandPipelineInput["createError"];
}): Promise<string> {
  try {
    return (
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
}

export async function importStartedRemoteMergeHandoff(input: {
  context: RemoteMergeFlowExecutionContext;
  remoteResult: ExecuteRemoteBubbleMergeCommandResult;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeCommandPipelineInput["createError"];
}): Promise<string> {
  const importSource = requireMatchingStartedRemoteHandoff({
    context: input.context,
    remoteResult: input.remoteResult,
    createError: input.createError
  });
  await fetchStartedRemoteHandoffRef({
    context: input.context,
    importSource,
    runGit: input.runGit,
    createError: input.createError
  });
  const importedCommitSha = await resolveStartedRemoteImportedCommit({
    context: input.context,
    runGit: input.runGit,
    createError: input.createError
  });

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
