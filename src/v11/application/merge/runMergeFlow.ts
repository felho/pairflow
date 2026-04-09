import { isNamedError } from "../../shared/errors/namedError.js";
import type { MergeBubbleResult } from "./mergeCommandContract.js";
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

async function mergeBubbleBranchIntoBase(input: {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeFlowInput["createError"];
}): Promise<string> {
  await input.runGit(["checkout", input.baseBranch], {
    cwd: input.repoPath
  });

  try {
    await input.runGit(["merge", "--no-ff", "--no-edit", input.bubbleBranch], {
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
    await input.runGit(["push", "origin", input.baseBranch], {
      cwd: input.repoPath
    });
    pushedBaseBranch = true;
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

export async function runMergeFlow(
  input: RunMergeFlowInput,
  dependencies: ResolvedMergeCommandDependencies
): Promise<MergeBubbleResult> {
  const context = await initializeMergeFlowExecutionContext({
    params: input,
    dependencies
  });

  const mergeCommitSha = await mergeBubbleBranchIntoBase({
    repoPath: context.repoPath,
    baseBranch: context.baseBranch,
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
    pushedBaseBranch,
    deletedRemoteBranch,
    tmuxSessionName: finalization.tmux.sessionName,
    tmuxSessionExisted: finalization.tmux.existed,
    runtimeSessionRemoved: finalization.runtimeSessionRemoved,
    removedWorktree: finalization.workspaceCleanup.removedWorktree,
    removedBubbleBranch: finalization.workspaceCleanup.removedBranch
  });
}
