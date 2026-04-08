import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { runGit } from "./git.js";

export async function isWorktreeRegistered(
  repoPath: string,
  worktreePath: string
): Promise<boolean> {
  const normalizedWorktreePath = await realpath(worktreePath).catch(() => resolve(worktreePath));
  const listedWorktrees = await runGit(["worktree", "list", "--porcelain"], {
    cwd: repoPath
  });

  const candidatePaths = listedWorktrees.stdout
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));

  for (const candidatePath of candidatePaths) {
    const normalizedCandidatePath = await realpath(candidatePath).catch(() => resolve(candidatePath));
    if (normalizedCandidatePath === normalizedWorktreePath) {
      return true;
    }
  }

  return false;
}
