import { isAbsolute, resolve } from "node:path";

import type { RunGitPort } from "../../../../ports/git.js";
import { BubbleCommitError } from "../error/commitCommandRuntime.js";

function isPathInside(parentPath: string, childPath: string): boolean {
  const normalizedParent = resolve(parentPath);
  const normalizedChild = resolve(childPath);
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}/`)
  );
}

export function formatCommitErrorMessage(input: {
  reasonCode: string;
  message: string;
  context: Record<string, unknown>;
}): string {
  return `${input.reasonCode}: ${input.message} context=${JSON.stringify(input.context)}`;
}

export async function collectStagedFiles(
  worktreePath: string,
  runGit: RunGitPort
): Promise<string[]> {
  const staged = await runGit(["diff", "--cached", "--name-only"], {
    cwd: worktreePath
  });
  return staged.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function assertStagedFilesWithinWorktree(
  stagedFiles: string[],
  worktreePath: string,
  bubbleId: string
): void {
  for (const file of stagedFiles) {
    if (isAbsolute(file)) {
      throw new BubbleCommitError(
        formatCommitErrorMessage({
          reasonCode: "COMMIT_STAGED_PATH_ABSOLUTE",
          message: `Invalid staged file path (absolute path not allowed): ${file}`,
          context: {
            bubble_id: bubbleId,
            command_name: "commit",
            staged_file: file,
            worktree_path: worktreePath
          }
        })
      );
    }

    const absoluteFilePath = resolve(worktreePath, file);
    if (!isPathInside(worktreePath, absoluteFilePath)) {
      throw new BubbleCommitError(
        formatCommitErrorMessage({
          reasonCode: "COMMIT_STAGED_PATH_OUTSIDE_WORKTREE",
          message: `Staged file is outside bubble worktree scope: ${file}`,
          context: {
            bubble_id: bubbleId,
            command_name: "commit",
            staged_file: file,
            worktree_path: worktreePath
          }
        })
      );
    }
  }
}
