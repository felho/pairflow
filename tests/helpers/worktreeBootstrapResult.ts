import type { WorktreeBootstrapResult } from "../../src/v11/shared/ports/worktreeWorkspace.js";

export function buildWorktreeBootstrapResult(input: {
  repoPath: string;
  bubbleBranch: string;
  worktreePath: string;
  baseRef?: string;
  branchPrepared?: boolean;
}): WorktreeBootstrapResult {
  return {
    repoPath: input.repoPath,
    baseRef: input.baseRef ?? "refs/heads/main",
    bubbleBranch: input.bubbleBranch,
    worktreePath: input.worktreePath,
    workspacePath: input.worktreePath,
    workspaceKind: "worktree",
    branchPrepared: input.branchPrepared ?? true
  };
}
