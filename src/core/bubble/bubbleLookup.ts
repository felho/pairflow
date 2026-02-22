import { access, readFile, realpath } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../config/bubbleConfig.js";
import { getBubblePaths, type BubblePaths } from "./paths.js";
import type { BubbleConfig } from "../../types/bubble.js";

export interface ResolvedBubbleById {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  bubblePaths: BubblePaths;
  repoPath: string;
}

export class BubbleLookupError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleLookupError";
  }
}

async function fileExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function findRepoPathForBubbleFromCwd(
  cwdInput: string,
  bubbleId: string
): Promise<string | undefined> {
  let current = resolve(cwdInput);

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
      return undefined;
    }

    current = parent;
  }
}

async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

export async function resolveBubbleById(input: {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}): Promise<ResolvedBubbleById> {
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

  const bubblePaths = getBubblePaths(configRepoPath, bubbleConfig.id);

  return {
    bubbleId: bubbleConfig.id,
    bubbleConfig,
    bubblePaths,
    repoPath: configRepoPath
  };
}
