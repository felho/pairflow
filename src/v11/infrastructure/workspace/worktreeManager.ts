import { cp, lstat, mkdir, realpath, stat, symlink } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import {
  GitRepositoryError,
  assertGitRepository,
  branchExists,
  refExists,
  runGit
} from "./git.js";
import {
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE
} from "../../../config/defaults.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort,
  LocalOverlayConfig,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult,
  WorktreeCleanupInput,
  WorktreeCleanupResult
} from "../../shared/ports/worktreeWorkspace.js";

export { GitCommandError } from "./git.js";
export type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort,
  LocalOverlayConfig,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult,
  WorktreeCleanupInput,
  WorktreeCleanupResult
} from "../../shared/ports/worktreeWorkspace.js";

interface WorkspaceErrorContext {
  baseBranch?: string | undefined;
  baseRef?: string | undefined;
  bubbleBranch?: string | undefined;
  entry?: string | undefined;
  localOverlayMode?: LocalOverlayConfig["mode"] | undefined;
  path?: string | undefined;
  reason?: string | undefined;
  repoPath?: string | undefined;
  worktreePath?: string | undefined;
}

interface WorkspaceErrorOptions extends ErrorOptions {
  context?: WorkspaceErrorContext | undefined;
}

export class WorkspaceError extends Error {
  public readonly context: WorkspaceErrorContext | undefined;

  public constructor(message: string, options?: WorkspaceErrorOptions) {
    super(message, options);
    this.name = "WorkspaceError";
    this.context = options?.context;
  }
}

export class WorkspaceBootstrapError extends WorkspaceError {
  public constructor(message: string, options?: WorkspaceErrorOptions) {
    super(message, options);
    this.name = "WorkspaceBootstrapError";
  }
}

export class WorkspaceCleanupError extends WorkspaceError {
  public constructor(message: string, options?: WorkspaceErrorOptions) {
    super(message, options);
    this.name = "WorkspaceCleanupError";
  }
}

function toWorkspaceBootstrapError(input: {
  message: string;
  context: WorkspaceErrorContext;
  cause?: unknown;
}): WorkspaceBootstrapError {
  return new WorkspaceBootstrapError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function toWorkspaceCleanupError(input: {
  message: string;
  context: WorkspaceErrorContext;
  cause?: unknown;
}): WorkspaceCleanupError {
  return new WorkspaceCleanupError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

async function assertGitRepositoryForBootstrap(repoPath: string): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    if (error instanceof GitRepositoryError) {
      throw toWorkspaceBootstrapError({
        message: error.message,
        context: {
          reason: "invalid_git_repository",
          repoPath
        },
        cause: error
      });
    }
    throw error;
  }
}

async function assertGitRepositoryForCleanup(repoPath: string): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    if (error instanceof GitRepositoryError) {
      throw toWorkspaceCleanupError({
        message: error.message,
        context: {
          reason: "invalid_git_repository",
          repoPath
        },
        cause: error
      });
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
    throw toWorkspaceBootstrapError({
      message: `Base ref '${baseBranch}' resolves to tag '${tagRef}'. Tags are not supported for --base; use a branch name.`,
      context: {
        baseBranch,
        baseRef: tagRef,
        reason: "base_ref_is_tag",
        repoPath
      }
    });
  }

  throw toWorkspaceBootstrapError({
    message: `Base branch not found as local or origin remote ref: ${baseBranch}`,
    context: {
      baseBranch,
      reason: "base_branch_not_found",
      repoPath
    }
  });
}

async function assertPathDoesNotExist(path: string): Promise<void> {
  try {
    await stat(path);
    throw toWorkspaceBootstrapError({
      message: `Path already exists: ${path}`,
      context: {
        path,
        reason: "path_already_exists"
      }
    });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw error;
    }
  }
}

function resolveLocalOverlayConfig(
  input: LocalOverlayConfig | undefined
): LocalOverlayConfig {
  if (input === undefined) {
    return {
      enabled: DEFAULT_LOCAL_OVERLAY_ENABLED,
      mode: DEFAULT_LOCAL_OVERLAY_MODE,
      entries: [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
    };
  }

  return {
    enabled: input.enabled,
    mode: input.mode,
    entries: [...input.entries]
  };
}

function assertLocalOverlayEntry(entry: string): void {
  if (entry.trim().length === 0) {
    throw toWorkspaceBootstrapError({
      message: "Local overlay entry cannot be empty.",
      context: {
        entry,
        reason: "empty_local_overlay_entry"
      }
    });
  }

  if (isAbsolute(entry)) {
    throw toWorkspaceBootstrapError({
      message: `Local overlay entry must be a relative path: ${entry}`,
      context: {
        entry,
        reason: "absolute_local_overlay_entry"
      }
    });
  }

  const normalized = entry.replaceAll("\\", "/");
  if (normalized.includes("//")) {
    throw toWorkspaceBootstrapError({
      message: `Local overlay entry must be normalized: ${entry}`,
      context: {
        entry,
        reason: "non_normalized_local_overlay_entry"
      }
    });
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || segment.length === 0)) {
    throw toWorkspaceBootstrapError({
      message: `Local overlay entry cannot contain '.'/'..' segments: ${entry}`,
      context: {
        entry,
        reason: "invalid_local_overlay_segments"
      }
    });
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function syncLocalOverlayEntries(input: {
  repoPath: string;
  worktreePath: string;
  config: LocalOverlayConfig | undefined;
}): Promise<void> {
  const localOverlay = resolveLocalOverlayConfig(input.config);
  if (!localOverlay.enabled) {
    return;
  }

  for (const entry of localOverlay.entries) {
    assertLocalOverlayEntry(entry);

    const sourcePath = resolve(input.repoPath, entry);
    const targetPath = resolve(input.worktreePath, entry);

    if (!(await pathExists(sourcePath))) {
      continue;
    }

    if (await pathExists(targetPath)) {
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    if (localOverlay.mode === "copy") {
      const sourceStats = await lstat(sourcePath);
      await cp(sourcePath, targetPath, {
        recursive: sourceStats.isDirectory(),
        errorOnExist: true,
        force: false
      });
      continue;
    }

    await symlink(sourcePath, targetPath);
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
    worktreePath
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
