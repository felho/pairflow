import { readdir, readFile, realpath } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../../config/bubbleConfig.js";
import { getBubblePaths, type BubblePaths } from "../../../shared/bubble/bubblePaths.js";
import type { BubbleConfig } from "../../../shared/config/bubbleConfigTypes.js";

interface WorkspaceResolutionErrorContext {
  branchName?: string | undefined;
  candidateCount?: number | undefined;
  cwd?: string | undefined;
  reason?: string | undefined;
  repoPath?: string | undefined;
  worktreePath?: string | undefined;
}

interface WorkspaceResolutionErrorOptions extends ErrorOptions {
  context?: WorkspaceResolutionErrorContext | undefined;
}

export class WorkspaceResolutionError extends Error {
  public readonly context: WorkspaceResolutionErrorContext | undefined;

  public constructor(message: string, options?: WorkspaceResolutionErrorOptions) {
    super(message, options);
    this.name = "WorkspaceResolutionError";
    this.context = options?.context;
  }
}

export function toWorkspaceResolutionError(input: {
  message: string;
  context: WorkspaceResolutionErrorContext;
  cause?: unknown;
}): WorkspaceResolutionError {
  return new WorkspaceResolutionError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const rel = relative(parentPath, childPath);
  return rel === "" || (!rel.startsWith("..") && rel !== "..");
}

export async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

export function extractBubbleIdFromBranch(branchName: string | undefined): string | undefined {
  if (branchName === undefined || branchName === "HEAD") {
    return undefined;
  }

  const prefixes = ["bubble/", "pf/"];
  for (const prefix of prefixes) {
    if (branchName.startsWith(prefix)) {
      const bubbleId = branchName.slice(prefix.length).trim();
      return bubbleId.length > 0 ? bubbleId : undefined;
    }
  }

  return undefined;
}

export async function loadBubbleConfigById(
  repoPath: string,
  bubbleId: string
): Promise<{ config: BubbleConfig; paths: BubblePaths } | undefined> {
  const bubbleTomlPath = join(repoPath, ".pairflow", "bubbles", bubbleId, "bubble.toml");

  const raw = await readFile(bubbleTomlPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return undefined;
  }

  const config = parseBubbleConfigToml(raw);
  return {
    config,
    paths: getBubblePaths(config.repo_path, config.id)
  };
}

export async function doesCandidateMatchWorkspace(
  candidate: { config: BubbleConfig; paths: BubblePaths },
  normalizedRepoPath: string,
  normalizedWorktreePath: string
): Promise<boolean> {
  const configRepoPath = resolve(candidate.config.repo_path);
  const normalizedConfigRepoPath = await normalizePath(configRepoPath);
  if (normalizedConfigRepoPath !== normalizedRepoPath) {
    return false;
  }

  const expectedWorktreePath = resolve(candidate.paths.worktreePath);
  const normalizedExpectedWorktreePath = await normalizePath(expectedWorktreePath);
  if (isPathInside(normalizedExpectedWorktreePath, normalizedWorktreePath)) {
    return true;
  }

  // Remote ssh executor bubbles run directly from a remote clone root rather
  // than from the local `.pairflow-worktrees/...` path derived by getBubblePaths.
  // In that self-host layout the git repo root and worktree root are the same
  // remote clone path, so branch-based resolution should accept the bubble even
  // though the derived local worktree path does not match.
  return candidate.config.executor?.type === "ssh"
    && normalizedConfigRepoPath === normalizedRepoPath
    && normalizedRepoPath === normalizedWorktreePath;
}

export async function listBubbleConfigs(
  repoPath: string
): Promise<Array<{ config: BubbleConfig; paths: BubblePaths }>> {
  const bubblesRoot = join(repoPath, ".pairflow", "bubbles");
  const entries = await readdir(bubblesRoot, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  );

  const result: Array<{ config: BubbleConfig; paths: BubblePaths }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const loaded = await loadBubbleConfigById(repoPath, entry.name);
    if (loaded !== undefined) {
      result.push(loaded);
    }
  }

  return result;
}

export function resolveMatchingBubbleConfig(input: {
  currentBranch: string | undefined;
  matches: Array<{ config: BubbleConfig; paths: BubblePaths }>;
  repoPath: string;
  worktreePath: string;
}): { config: BubbleConfig; paths: BubblePaths } {
  if (input.matches.length === 0) {
    throw toWorkspaceResolutionError({
      message: `No bubble config found for worktree path: ${input.worktreePath}`,
      context: {
        branchName: input.currentBranch,
        repoPath: input.repoPath,
        reason: "no_matching_bubble_config",
        worktreePath: input.worktreePath
      }
    });
  }

  if (input.matches.length > 1) {
    throw toWorkspaceResolutionError({
      message: `Multiple bubble configs matched worktree path ${input.worktreePath}; resolution is ambiguous`,
      context: {
        branchName: input.currentBranch,
        candidateCount: input.matches.length,
        repoPath: input.repoPath,
        reason: "ambiguous_bubble_config_match",
        worktreePath: input.worktreePath
      }
    });
  }

  const match = input.matches[0];
  if (match === undefined) {
    throw toWorkspaceResolutionError({
      message: `No bubble config found for worktree path: ${input.worktreePath}`,
      context: {
        branchName: input.currentBranch,
        repoPath: input.repoPath,
        reason: "missing_single_match",
        worktreePath: input.worktreePath
      }
    });
  }

  return match;
}
