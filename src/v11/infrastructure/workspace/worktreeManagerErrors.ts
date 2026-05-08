import { stat } from "node:fs/promises";

import {
  GitRepositoryError,
  assertGitRepository,
  branchExists,
  refExists
} from "./git.js";
import type { LocalOverlayConfig } from "../../ports/worktreeWorkspace.js";

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

export function toWorkspaceBootstrapError(input: {
  message: string;
  context: WorkspaceErrorContext;
  cause?: unknown;
}): WorkspaceBootstrapError {
  return new WorkspaceBootstrapError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

export function toWorkspaceCleanupError(input: {
  message: string;
  context: WorkspaceErrorContext;
  cause?: unknown;
}): WorkspaceCleanupError {
  return new WorkspaceCleanupError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

export async function assertGitRepositoryForBootstrap(repoPath: string): Promise<void> {
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

export async function assertGitRepositoryForCleanup(repoPath: string): Promise<void> {
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

export async function resolveBaseRef(repoPath: string, baseBranch: string): Promise<string> {
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

export async function assertPathDoesNotExist(path: string): Promise<void> {
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
