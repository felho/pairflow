import { mkdir, realpath, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  GitRepositoryError,
  assertGitRepository,
  branchExists,
  refExists,
  runGit
} from "./git.js";

export { GitCommandError } from "./git.js";

export class WorkspaceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export class WorkspaceBootstrapError extends WorkspaceError {
  public constructor(message: string) {
    super(message);
    this.name = "WorkspaceBootstrapError";
  }
}

export class WorkspaceCleanupError extends WorkspaceError {
  public constructor(message: string) {
    super(message);
    this.name = "WorkspaceCleanupError";
  }
}

export interface WorktreeBootstrapInput {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  worktreePath: string;
}

export interface WorktreeBootstrapResult {
  repoPath: string;
  baseRef: string;
  bubbleBranch: string;
  worktreePath: string;
}

export interface WorktreeCleanupInput {
  repoPath: string;
  bubbleBranch: string;
  worktreePath: string;
}

export interface WorktreeCleanupResult {
  repoPath: string;
  bubbleBranch: string;
  worktreePath: string;
  removedWorktree: boolean;
  removedBranch: boolean;
}

async function assertGitRepositoryForBootstrap(repoPath: string): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    if (error instanceof GitRepositoryError) {
      throw new WorkspaceBootstrapError(error.message);
    }
    throw error;
  }
}

async function assertGitRepositoryForCleanup(repoPath: string): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    if (error instanceof GitRepositoryError) {
      throw new WorkspaceCleanupError(error.message);
    }
    throw error;
  }
}

async function resolveBaseRef(repoPath: string, baseBranch: string): Promise<string> {
  const localRef = `refs/heads/${baseBranch}`;
  if (await branchExists(repoPath, baseBranch)) {
    return localRef;
  }

  const remoteRef = `refs/remotes/origin/${baseBranch}`;
  if (await refExists(repoPath, remoteRef)) {
    return remoteRef;
  }

  const tagRef = `refs/tags/${baseBranch}`;
  if (await refExists(repoPath, tagRef)) {
    throw new WorkspaceBootstrapError(
      `Base ref '${baseBranch}' resolves to tag '${tagRef}'. Tags are not supported for --base; use a branch name.`
    );
  }

  throw new WorkspaceBootstrapError(
    `Base branch not found as local or origin remote ref: ${baseBranch}`
  );
}

async function assertPathDoesNotExist(path: string): Promise<void> {
  try {
    await stat(path);
    throw new WorkspaceBootstrapError(`Path already exists: ${path}`);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw error;
    }
  }
}

async function isWorktreeRegistered(repoPath: string, worktreePath: string): Promise<boolean> {
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

export async function bootstrapWorktreeWorkspace(
  input: WorktreeBootstrapInput
): Promise<WorktreeBootstrapResult> {
  const repoPath = resolve(input.repoPath);
  const worktreePath = resolve(input.worktreePath);

  await assertGitRepositoryForBootstrap(repoPath);

  if (await branchExists(repoPath, input.bubbleBranch)) {
    throw new WorkspaceBootstrapError(
      `Bubble branch already exists: ${input.bubbleBranch}`
    );
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
  } catch (error) {
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
    worktreePath
  };
}

export async function cleanupWorktreeWorkspace(
  input: WorktreeCleanupInput
): Promise<WorktreeCleanupResult> {
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
}
