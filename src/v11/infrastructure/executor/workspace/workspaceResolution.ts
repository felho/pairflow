import { readdir, readFile, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../../config/bubbleConfig.js";
import { getBubblePaths, type BubblePaths } from "../../artifact/bubble/paths.js";
import { runGit } from "../../workspace/git.js";
import { listPairflowWorkspaceCandidateCwds } from "./commandWorkspaceFallback.js";
import type { BubbleConfig } from "../../../../types/bubble.js";
import type { ResolvedBubbleWorkspace } from "../../../shared/ports/workspaceResolution.js";

export type { ResolvedBubbleWorkspace } from "../../../shared/ports/workspaceResolution.js";

interface ResolvedRepositoryPaths {
  repoPath: string;
  worktreePath: string;
  currentBranch?: string;
}

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

function toWorkspaceResolutionError(input: {
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

async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

async function resolveRepositoryPaths(cwd: string): Promise<ResolvedRepositoryPaths> {
  const commonDirResult = await runGit(["rev-parse", "--git-common-dir"], {
    cwd,
    allowFailure: true
  });
  if (commonDirResult.exitCode !== 0) {
    throw toWorkspaceResolutionError({
      message: `Current directory is not inside a git repository: ${cwd}`,
      context: {
        cwd,
        reason: "not_in_git_repository"
      }
    });
  }

  const commonDirRaw = commonDirResult.stdout.trim();
  if (commonDirRaw.length === 0) {
    throw toWorkspaceResolutionError({
      message: `Could not resolve git common dir from cwd: ${cwd}`,
      context: {
        cwd,
        reason: "empty_git_common_dir"
      }
    });
  }

  const commonDirPath = resolve(cwd, commonDirRaw);
  const repoPath = dirname(commonDirPath);

  const topLevelResult = await runGit(["rev-parse", "--show-toplevel"], {
    cwd,
    allowFailure: true
  });
  if (topLevelResult.exitCode !== 0) {
    throw toWorkspaceResolutionError({
      message: `Could not resolve git worktree root from cwd: ${cwd}`,
      context: {
        cwd,
        reason: "missing_git_toplevel"
      }
    });
  }

  const topLevelRaw = topLevelResult.stdout.trim();
  if (topLevelRaw.length === 0) {
    throw toWorkspaceResolutionError({
      message: `Git top-level path is empty for cwd: ${cwd}`,
      context: {
        cwd,
        reason: "empty_git_toplevel"
      }
    });
  }

  const worktreePath = resolve(cwd, topLevelRaw);

  const branchResult = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    allowFailure: true
  });
  const branchOutput = branchResult.exitCode === 0 ? branchResult.stdout.trim() : "";

  return {
    repoPath,
    worktreePath,
    ...(branchOutput.length > 0 ? { currentBranch: branchOutput } : {})
  };
}

function extractBubbleIdFromBranch(branchName: string | undefined): string | undefined {
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

async function loadBubbleConfigById(
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

async function doesCandidateMatchWorkspace(
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
  return isPathInside(normalizedExpectedWorktreePath, normalizedWorktreePath);
}

async function listBubbleConfigs(repoPath: string): Promise<Array<{ config: BubbleConfig; paths: BubblePaths }>> {
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

function resolveMatchingBubbleConfig(input: {
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

export async function resolveBubbleFromWorkspaceCwd(
  cwdInput: string = process.cwd()
): Promise<ResolvedBubbleWorkspace> {
  let cwd: string | undefined;
  let repoPath: string | undefined;
  let worktreePath: string | undefined;
  let currentBranch: string | undefined;
  let firstError: unknown;

  for (const candidateCwd of listPairflowWorkspaceCandidateCwds(cwdInput)) {
    try {
      const resolvedRepository = await resolveRepositoryPaths(candidateCwd);
      cwd = candidateCwd;
      repoPath = resolvedRepository.repoPath;
      worktreePath = resolvedRepository.worktreePath;
      currentBranch = resolvedRepository.currentBranch;
      break;
    } catch (error) {
      firstError ??= error;
    }
  }

  if (
    cwd === undefined
    || repoPath === undefined
    || worktreePath === undefined
  ) {
    if (firstError instanceof Error) {
      throw firstError;
    }
    throw toWorkspaceResolutionError({
      message: `Could not resolve bubble workspace from cwd: ${resolve(cwdInput)}`,
      context: {
        cwd: resolve(cwdInput),
        reason: "workspace_resolution_failed"
      }
    });
  }

  const normalizedRepoPath = await normalizePath(repoPath);
  const normalizedWorktreePath = await normalizePath(worktreePath);

  const bubbleIdFromBranch = extractBubbleIdFromBranch(currentBranch);
  if (bubbleIdFromBranch !== undefined) {
    const directCandidate = await loadBubbleConfigById(repoPath, bubbleIdFromBranch);
    if (directCandidate !== undefined) {
      const matches = await doesCandidateMatchWorkspace(
        directCandidate,
        normalizedRepoPath,
        normalizedWorktreePath
      );
      if (matches) {
        return {
          bubbleId: directCandidate.config.id,
          bubbleConfig: directCandidate.config,
          bubblePaths: directCandidate.paths,
          repoPath,
          worktreePath,
          cwd
        };
      }
    }
  }

  const bubbleConfigs = await listBubbleConfigs(repoPath);
  const matches: Array<{ config: BubbleConfig; paths: BubblePaths }> = [];

  for (const candidate of bubbleConfigs) {
    if (
      await doesCandidateMatchWorkspace(
        candidate,
        normalizedRepoPath,
        normalizedWorktreePath
      )
    ) {
      matches.push(candidate);
    }
  }

  const match = resolveMatchingBubbleConfig({
    currentBranch,
    matches,
    repoPath,
    worktreePath
  });

  return {
    bubbleId: match.config.id,
    bubbleConfig: match.config,
    bubblePaths: match.paths,
    repoPath,
    worktreePath,
    cwd
  };
}
