import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  branchExists,
  runGit
} from "./git.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult,
  WorktreeCleanupInput,
  WorktreeCleanupResult
} from "../../shared/ports/worktreeWorkspace.js";
import {
  assertGitRepositoryForBootstrap,
  assertGitRepositoryForCleanup,
  assertPathDoesNotExist,
  resolveBaseRef,
  toWorkspaceBootstrapError,
} from "./worktreeManagerErrors.js";
import { syncLocalOverlayEntries } from "./worktreeManagerOverlay.js";
import { isWorktreeRegistered } from "./worktreeManagerRegistry.js";

export { GitCommandError } from "./git.js";
export {
  WorkspaceError,
  WorkspaceBootstrapError,
  WorkspaceCleanupError
} from "./worktreeManagerErrors.js";
export type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort,
  LocalOverlayConfig,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult,
  WorktreeCleanupInput,
  WorktreeCleanupResult
} from "../../shared/ports/worktreeWorkspace.js";

export const bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort = async (
  input: WorktreeBootstrapInput
): Promise<WorktreeBootstrapResult> => {
  const repoPath = resolve(input.repoPath);
  const worktreePath = resolve(input.worktreePath);

  await assertGitRepositoryForBootstrap(repoPath);

  if (await branchExists(repoPath, input.bubbleBranch)) {
    throw toWorkspaceBootstrapError({
      message: `Bubble branch already exists: ${input.bubbleBranch}`,
      context: {
        bubbleBranch: input.bubbleBranch,
        reason: "bubble_branch_exists",
        repoPath,
        worktreePath
      }
    });
  }

  const baseRef = await resolveBaseRef(repoPath, input.baseBranch);
  await assertPathDoesNotExist(worktreePath);
  await mkdir(dirname(worktreePath), { recursive: true });

  await runGit(["branch", input.bubbleBranch, baseRef], {
    cwd: repoPath
  });

  try {
    await runGit(["worktree", "add", worktreePath, input.bubbleBranch], {
      cwd: repoPath
    });
    await syncLocalOverlayEntries({
      repoPath,
      worktreePath,
      config: input.localOverlay
    });
  } catch (error) {
    await runGit(["worktree", "remove", "--force", worktreePath], {
      cwd: repoPath,
      allowFailure: true
    });
    await runGit(["branch", "-D", input.bubbleBranch], {
      cwd: repoPath,
      allowFailure: true
    });
    throw error;
  }

  return {
    repoPath,
    baseRef,
    bubbleBranch: input.bubbleBranch,
    worktreePath,
    workspacePath: worktreePath,
    workspaceKind: "worktree",
    branchPrepared: true
  };
};

export const cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort = async (
  input: WorktreeCleanupInput
): Promise<WorktreeCleanupResult> => {
  const repoPath = resolve(input.repoPath);
  const worktreePath = resolve(input.worktreePath);

  await assertGitRepositoryForCleanup(repoPath);

  let removedWorktree = false;
  if (await isWorktreeRegistered(repoPath, worktreePath)) {
    await runGit(["worktree", "remove", "--force", worktreePath], {
      cwd: repoPath
    });
    removedWorktree = true;
  }

  let removedBranch = false;
  if (await branchExists(repoPath, input.bubbleBranch)) {
    await runGit(["branch", "-D", input.bubbleBranch], {
      cwd: repoPath
    });
    removedBranch = true;
  }

  return {
    repoPath,
    bubbleBranch: input.bubbleBranch,
    worktreePath,
    removedWorktree,
    removedBranch
  };
};
