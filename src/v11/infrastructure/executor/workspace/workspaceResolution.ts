import { dirname, resolve } from "node:path";

import { runGit } from "../../workspace/git.js";
import { listPairflowWorkspaceCandidateCwds } from "./commandWorkspaceFallback.js";
import type { ResolvedBubbleWorkspace } from "../../../shared/ports/workspaceResolution.js";
import {
  doesCandidateMatchWorkspace,
  extractBubbleIdFromBranch,
  listBubbleConfigs,
  loadBubbleConfigById,
  normalizePath,
  resolveMatchingBubbleConfig,
  toWorkspaceResolutionError
} from "./workspaceResolutionSupport.js";

export type { ResolvedBubbleWorkspace } from "../../../shared/ports/workspaceResolution.js";
export { WorkspaceResolutionError } from "./workspaceResolutionSupport.js";

interface ResolvedRepositoryPaths {
  repoPath: string;
  worktreePath: string;
  currentBranch?: string;
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
  const matches: typeof bubbleConfigs = [];

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
