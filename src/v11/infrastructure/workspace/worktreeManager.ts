import { mkdir, rm } from "node:fs/promises";
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

type CleanupWorkspaceKind = "registered-worktree" | "clone" | "none";

async function isGitWorkspace(path: string): Promise<boolean> {
  try {
    const insideWorktree = await runGit(["rev-parse", "--is-inside-work-tree"], {
      cwd: path,
      allowFailure: true
    });
    return insideWorktree.exitCode === 0 && insideWorktree.stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function resolveCleanupWorkspaceKind(
  repoPath: string,
  worktreePath: string
): Promise<CleanupWorkspaceKind> {
  if (await isWorktreeRegistered(repoPath, worktreePath)) {
    return "registered-worktree";
  }

  if (await isGitWorkspace(worktreePath)) {
    return "clone";
  }

  return "none";
}

async function hasCloneBranchOwnership(input: {
  repoPath: string;
  worktreePath: string;
  bubbleBranch: string;
}): Promise<boolean> {
  const cloneHead = await runGit(["rev-parse", "HEAD"], {
    cwd: input.worktreePath,
    allowFailure: true
  });
  if (cloneHead.exitCode !== 0) {
    return false;
  }

  const cloneBranch = await runGit(
    ["rev-parse", "--verify", `refs/heads/${input.bubbleBranch}`],
    {
      cwd: input.worktreePath,
      allowFailure: true
    }
  );
  if (cloneBranch.exitCode !== 0) {
    return false;
  }

  const sourceBranch = await runGit(
    ["rev-parse", "--verify", `refs/heads/${input.bubbleBranch}`],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );
  if (sourceBranch.exitCode !== 0) {
    return false;
  }

  const cloneHeadSha = cloneHead.stdout.trim();
  const cloneBranchSha = cloneBranch.stdout.trim();
  const sourceBranchSha = sourceBranch.stdout.trim();
  if (
    cloneHeadSha.length === 0
    || cloneBranchSha.length === 0
    || sourceBranchSha.length === 0
  ) {
    return false;
  }

  return cloneHeadSha === cloneBranchSha && cloneBranchSha === sourceBranchSha;
}

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

  const workspaceKind = await resolveCleanupWorkspaceKind(repoPath, worktreePath);
  const canRemoveBranch =
    workspaceKind === "registered-worktree"
      ? true
      : workspaceKind === "clone"
        ? await hasCloneBranchOwnership({
          repoPath,
          worktreePath,
          bubbleBranch: input.bubbleBranch
        })
        : false;

  let removedWorktree = false;
  if (workspaceKind === "registered-worktree") {
    await runGit(["worktree", "remove", "--force", worktreePath], {
      cwd: repoPath
    });
    removedWorktree = true;
  } else if (workspaceKind === "clone") {
    await rm(worktreePath, { recursive: true, force: true });
    removedWorktree = true;
  }

  let removedBranch = false;
  if (canRemoveBranch && await branchExists(repoPath, input.bubbleBranch)) {
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
