import { runGit } from "../../infrastructure/workspace/git.js";
import type { CommitBubbleInput } from "./commitCommandContract.js";
import type {
  CommitGitResult,
  CommitRuntimeContext
} from "./commitCommandApiContract.js";
import { BubbleCommitError } from "./commitCommandRuntime.js";
import {
  assertStagedFilesWithinWorktree,
  collectStagedFiles,
  formatCommitErrorMessage
} from "./commitStagedFiles.js";

export async function runCommitGitStep(input: {
  command: CommitBubbleInput;
  context: CommitRuntimeContext;
  auto: boolean;
}): Promise<CommitGitResult> {
  if (input.auto) {
    await runGit(["add", "-A"], {
      cwd: input.context.resolved.bubblePaths.worktreePath
    });
  }

  const stagedFiles = await collectStagedFiles(input.context.resolved.bubblePaths.worktreePath);
  if (stagedFiles.length === 0) {
    throw new BubbleCommitError(
      formatCommitErrorMessage({
        reasonCode: "COMMIT_STAGED_FILES_EMPTY",
        message:
          input.auto
            ? `No staged files found in bubble worktree even after --auto stage-all (bubble_id=${input.context.resolved.bubbleId}; command_name=commit).`
            : `No staged files found in bubble worktree. Stage changes before commit, or use \`pairflow bubble commit --auto\` (bubble_id=${input.context.resolved.bubbleId}; command_name=commit).`,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          command_name: "commit",
          auto_generate: input.auto,
          worktree_path: input.context.resolved.bubblePaths.worktreePath
        }
      })
    );
  }

  assertStagedFilesWithinWorktree(
    stagedFiles,
    input.context.resolved.bubblePaths.worktreePath,
    input.context.resolved.bubbleId
  );

  const commitMessage = input.command.message ?? `bubble(${input.context.resolved.bubbleId}): finalize`;
  await runGit(["commit", "-m", commitMessage], {
    cwd: input.context.resolved.bubblePaths.worktreePath
  });
  const commitSha = (
    await runGit(["rev-parse", "HEAD"], {
      cwd: input.context.resolved.bubblePaths.worktreePath
    })
  ).stdout.trim();

  return { stagedFiles, commitMessage, commitSha };
}
