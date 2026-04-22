import { access, readFile, realpath } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../../config/bubbleConfig.js";
import { getBubblePaths } from "../../artifact/bubble/paths.js";
import { listPairflowWorkspaceCandidateCwds } from "./commandWorkspaceFallback.js";
import { resolveRepoPath } from "./repoResolution.js";
import type {
  ResolveBubbleByIdInput,
  ResolveBubbleByIdPort,
  ResolvedBubbleById
} from "../../../shared/ports/bubbleLookup.js";

export type {
  ResolveBubbleByIdInput,
  ResolveBubbleByIdPort,
  ResolvedBubbleById
} from "../../../shared/ports/bubbleLookup.js";

export class BubbleLookupError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleLookupError";
  }
}

interface RemoteWorkspaceAuthorityCandidate {
  modeEnvVar: string;
  expectedMode: string;
  workspaceRootEnvVar: string;
}

const remoteWorkspaceAuthorityCandidates: readonly RemoteWorkspaceAuthorityCandidate[] = [
  {
    modeEnvVar: "PAIRFLOW_REMOTE_START_MODE",
    expectedMode: "inner_remote_activation",
    workspaceRootEnvVar: "PAIRFLOW_REMOTE_START_WORKSPACE_ROOT"
  },
  {
    modeEnvVar: "PAIRFLOW_REMOTE_COMMIT_MODE",
    expectedMode: "inner_remote_execution",
    workspaceRootEnvVar: "PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT"
  },
  {
    modeEnvVar: "PAIRFLOW_REMOTE_MERGE_MODE",
    expectedMode: "inner_remote_execution",
    workspaceRootEnvVar: "PAIRFLOW_REMOTE_MERGE_WORKSPACE_ROOT"
  },
  {
    modeEnvVar: "PAIRFLOW_REMOTE_DELETE_MODE",
    expectedMode: "inner_remote_execution",
    workspaceRootEnvVar: "PAIRFLOW_REMOTE_DELETE_WORKSPACE_ROOT"
  }
] as const;

async function fileExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function findRepoPathForBubbleFromCwd(
  cwdInput: string,
  bubbleId: string
): Promise<string | undefined> {
  for (const candidateCwd of listPairflowWorkspaceCandidateCwds(cwdInput)) {
    let current = candidateCwd;

    while (true) {
      const candidate = join(
        current,
        ".pairflow",
        "bubbles",
        bubbleId,
        "bubble.toml"
      );
      if (await fileExists(candidate)) {
        return current;
      }

      const parent = dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }

    const resolvedRepoPath = await resolveRepoPath({
      cwd: candidateCwd
    }).catch(() => undefined);
    if (resolvedRepoPath === undefined) {
      continue;
    }

    const repoCandidate = join(
      resolvedRepoPath,
      ".pairflow",
      "bubbles",
      bubbleId,
      "bubble.toml"
    );
    if (await fileExists(repoCandidate)) {
      return resolvedRepoPath;
    }
  }

  return undefined;
}

async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

async function resolveRemoteWorkspaceAuthorityOverride(input: {
  repoPath: string;
  derivedWorktreePath: string;
}): Promise<string | undefined> {
  if (await fileExists(input.derivedWorktreePath)) {
    return undefined;
  }

  const normalizedRepoPath = await normalizePath(input.repoPath);
  for (const candidate of remoteWorkspaceAuthorityCandidates) {
    const mode = process.env[candidate.modeEnvVar]?.trim();
    if (mode !== candidate.expectedMode) {
      continue;
    }

    const workspaceRoot = process.env[candidate.workspaceRootEnvVar]?.trim();
    if (workspaceRoot === undefined || workspaceRoot.length === 0) {
      continue;
    }

    const normalizedWorkspaceRoot = await normalizePath(workspaceRoot);
    if (normalizedWorkspaceRoot !== normalizedRepoPath) {
      continue;
    }

    return normalizedWorkspaceRoot;
  }

  return undefined;
}

export const resolveBubbleById: ResolveBubbleByIdPort = async (
  input: ResolveBubbleByIdInput
): Promise<ResolvedBubbleById> => {
  const bubbleId = input.bubbleId.trim();
  if (bubbleId.length === 0) {
    throw new BubbleLookupError("Bubble id cannot be empty.");
  }

  const resolvedRepoPath =
    input.repoPath !== undefined
      ? resolve(input.repoPath)
      : await findRepoPathForBubbleFromCwd(input.cwd ?? process.cwd(), bubbleId);

  if (resolvedRepoPath === undefined) {
    throw new BubbleLookupError(
      `Could not locate bubble ${bubbleId} from cwd ${input.cwd ?? process.cwd()}`
    );
  }

  const bubbleTomlPath = join(
    resolvedRepoPath,
    ".pairflow",
    "bubbles",
    bubbleId,
    "bubble.toml"
  );

  const bubbleToml = await readFile(bubbleTomlPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new BubbleLookupError(
          `Bubble ${bubbleId} does not exist in repository: ${resolvedRepoPath}`
        );
      }
      throw error;
    }
  );

  const bubbleConfig = parseBubbleConfigToml(bubbleToml);
  if (bubbleConfig.id !== bubbleId) {
    throw new BubbleLookupError(
      `Bubble id mismatch in config: expected ${bubbleId}, found ${bubbleConfig.id}`
    );
  }

  const configRepoPath = resolve(bubbleConfig.repo_path);
  const normalizedConfigRepoPath = await normalizePath(configRepoPath);
  const normalizedResolvedRepoPath = await normalizePath(resolvedRepoPath);
  if (normalizedConfigRepoPath !== normalizedResolvedRepoPath) {
    throw new BubbleLookupError(
      `Bubble ${bubbleId} belongs to different repository path: ${configRepoPath}`
    );
  }

  const derivedBubblePaths = getBubblePaths(configRepoPath, bubbleConfig.id);
  const remoteWorkspaceAuthorityOverride =
    await resolveRemoteWorkspaceAuthorityOverride({
      repoPath: configRepoPath,
      derivedWorktreePath: derivedBubblePaths.worktreePath
    });
  const bubblePaths =
    remoteWorkspaceAuthorityOverride === undefined
      ? derivedBubblePaths
      : {
          ...derivedBubblePaths,
          worktreePath: remoteWorkspaceAuthorityOverride
        };

  return {
    bubbleId: bubbleConfig.id,
    bubbleToml,
    bubbleConfig,
    bubblePaths,
    repoPath: configRepoPath
  };
};
