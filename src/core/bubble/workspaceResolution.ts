import { readdir, readFile, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../config/bubbleConfig.js";
import { getBubblePaths, type BubblePaths } from "./paths.js";
import { runGit } from "../workspace/git.js";
import type { BubbleConfig } from "../../types/bubble.js";

export interface ResolvedBubbleWorkspace {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  bubblePaths: BubblePaths;
  repoPath: string;
  worktreePath: string;
  cwd: string;
}

interface ResolvedRepositoryPaths {
  repoPath: string;
  worktreePath: string;
  currentBranch?: string;
}

export class WorkspaceResolutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WorkspaceResolutionError";
  }
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
    throw new WorkspaceResolutionError(
      `Current directory is not inside a git repository: ${cwd}`
    );
  }

  const commonDirRaw = commonDirResult.stdout.trim();
  if (commonDirRaw.length === 0) {
    throw new WorkspaceResolutionError(
      `Could not resolve git common dir from cwd: ${cwd}`
    );
  }

  const commonDirPath = resolve(cwd, commonDirRaw);
  const repoPath = dirname(commonDirPath);

  const topLevelResult = await runGit(["rev-parse", "--show-toplevel"], {
    cwd,
    allowFailure: true
  });
  if (topLevelResult.exitCode !== 0) {
    throw new WorkspaceResolutionError(
      `Could not resolve git worktree root from cwd: ${cwd}`
    );
  }

  const topLevelRaw = topLevelResult.stdout.trim();
  if (topLevelRaw.length === 0) {
    throw new WorkspaceResolutionError(
      `Git top-level path is empty for cwd: ${cwd}`
    );
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

export async function resolveBubbleFromWorkspaceCwd(
  cwdInput: string = process.cwd()
): Promise<ResolvedBubbleWorkspace> {
  const cwd = resolve(cwdInput);
  const { repoPath, worktreePath, currentBranch } = await resolveRepositoryPaths(cwd);

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

  if (matches.length === 0) {
    throw new WorkspaceResolutionError(
      `No bubble config found for worktree path: ${worktreePath}`
    );
  }

  if (matches.length > 1) {
    throw new WorkspaceResolutionError(
      `Multiple bubble configs matched worktree path ${worktreePath}; resolution is ambiguous`
    );
  }

  const match = matches[0];
  if (match === undefined) {
    throw new WorkspaceResolutionError(
      `No bubble config found for worktree path: ${worktreePath}`
    );
  }

  return {
    bubbleId: match.config.id,
    bubbleConfig: match.config,
    bubblePaths: match.paths,
    repoPath,
    worktreePath,
    cwd
  };
}
