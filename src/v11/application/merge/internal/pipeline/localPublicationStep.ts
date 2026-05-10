import { isNamedError } from "../../../../shared/errors/namedError.js";
import type { ResolvedMergeCommandDependencies } from "../../mergeCommandDependencyResolution.js";
import type { RunMergeCommandPipelineInput } from "../../mergeCommandContract.js";
import {
  ensureOriginRemote,
  hasOriginRemoteError,
  remoteBranchExists
} from "../flow/mergeRoutingEligibility.js";

const MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE =
  "MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE";
const MERGE_REMOTE_DELETE_FAILED = "MERGE_REMOTE_DELETE_FAILED";
const MERGE_BASE_BRANCH_PUSH_FAILED = "MERGE_BASE_BRANCH_PUSH_FAILED";

export async function publishLocalMergeResult(input: {
  push: boolean;
  deleteRemote: boolean;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeCommandPipelineInput["createError"];
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
