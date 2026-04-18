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
const MERGE_BASE_BRANCH_PUSH_FAILED = "MERGE_BASE_BRANCH_PUSH_FAILED";

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

export async function runMergeFlow(
  input: RunMergeFlowInput,
  dependencies: ResolvedMergeCommandDependencies
): Promise<MergeBubbleResult> {
  const context = await initializeMergeFlowExecutionContext({
    params: input,
    dependencies
  });

  if (context.route === "remote") {
    const remoteResult = await dependencies.executeRemoteBubbleMergeCommand({
      bubbleId: context.resolved.bubbleId,
      remoteClonePath: context.remotePointer.remoteClonePath,
      remoteTarget: context.remoteTarget,
      push: input.push,
      deleteRemote: input.deleteRemote
    });

    await finalizeMergeFlow({
      params: input,
      context,
      dependencies,
      mergeCommitSha: remoteResult.mergeCommitSha,
      pushedBaseBranch: remoteResult.pushedBaseBranch,
      deletedRemoteBranch: remoteResult.deletedRemoteBranch
    });

    return buildMergeBubbleResult({
      bubbleId: context.resolved.bubbleId,
      baseBranch: remoteResult.baseBranch,
      bubbleBranch: remoteResult.bubbleBranch,
      mergeCommitSha: remoteResult.mergeCommitSha,
      pushedBaseBranch: remoteResult.pushedBaseBranch,
      deletedRemoteBranch: remoteResult.deletedRemoteBranch,
      tmuxSessionName: remoteResult.tmuxSessionName,
      tmuxSessionExisted: remoteResult.tmuxSessionExisted,
      runtimeSessionRemoved: remoteResult.runtimeSessionRemoved,
      removedWorktree: remoteResult.removedWorktree,
      removedBubbleBranch: remoteResult.removedBubbleBranch
    });
  }

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
  if (finalization === undefined) {
    throw new Error("Local merge finalization did not return cleanup results.");
  }

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
