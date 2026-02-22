import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../config/bubbleConfig.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { readRuntimeSessionsRegistry } from "../runtime/sessionsRegistry.js";
import { getBubblePaths } from "./paths.js";
import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "./repoResolution.js";
import type { BubbleLifecycleState } from "../../types/bubble.js";
import type { RuntimeSessionRecord } from "../runtime/sessionsRegistry.js";

export interface BubbleListInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface BubbleListEntry {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  runtimeSession: RuntimeSessionRecord | null;
}

export interface BubbleListStateCounts {
  CREATED: number;
  PREPARING_WORKSPACE: number;
  RUNNING: number;
  WAITING_HUMAN: number;
  READY_FOR_APPROVAL: number;
  APPROVED_FOR_COMMIT: number;
  COMMITTED: number;
  DONE: number;
  FAILED: number;
  CANCELLED: number;
}

export interface BubbleListView {
  repoPath: string;
  total: number;
  byState: BubbleListStateCounts;
  runtimeSessions: {
    registered: number;
    stale: number;
  };
  bubbles: BubbleListEntry[];
}

export class BubbleListError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleListError";
  }
}

function createZeroCounts(): BubbleListStateCounts {
  return {
    CREATED: 0,
    PREPARING_WORKSPACE: 0,
    RUNNING: 0,
    WAITING_HUMAN: 0,
    READY_FOR_APPROVAL: 0,
    APPROVED_FOR_COMMIT: 0,
    COMMITTED: 0,
    DONE: 0,
    FAILED: 0,
    CANCELLED: 0
  };
}

async function listBubbleIds(repoPath: string): Promise<string[]> {
  const root = join(repoPath, ".pairflow", "bubbles");
  const entries = await readdir(root, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  );

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function listBubbles(input: BubbleListInput = {}): Promise<BubbleListView> {
  let repoPath: string;
  try {
    repoPath = await resolveRepoPath(input);
  } catch (error) {
    if (error instanceof RepoResolutionError) {
      throw new BubbleListError(error.message);
    }
    throw error;
  }
  const bubbleIds = await listBubbleIds(repoPath);
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  const normalizedRepoPath = await normalizeRepoPath(repoPath);

  const bubbles: BubbleListEntry[] = [];
  const byState = createZeroCounts();
  let runtimeRegistered = 0;

  for (const bubbleId of bubbleIds) {
    const bubbleTomlPath = join(
      repoPath,
      ".pairflow",
      "bubbles",
      bubbleId,
      "bubble.toml"
    );
    const statePath = join(
      repoPath,
      ".pairflow",
      "bubbles",
      bubbleId,
      "state.json"
    );

    const [bubbleToml, stateLoaded] = await Promise.all([
      readFile(bubbleTomlPath, "utf8"),
      readStateSnapshot(statePath)
    ]);

    const config = parseBubbleConfigToml(bubbleToml);
    if (config.id !== bubbleId) {
      throw new BubbleListError(
        `Bubble config id mismatch: expected ${bubbleId}, found ${config.id}`
      );
    }

    const normalizedConfigRepoPath = await normalizeRepoPath(resolve(config.repo_path));
    if (normalizedConfigRepoPath !== normalizedRepoPath) {
      throw new BubbleListError(
        `Bubble ${bubbleId} belongs to different repository path: ${config.repo_path}`
      );
    }

    const runtimeSession = sessions[bubbleId] ?? null;
    if (runtimeSession !== null) {
      runtimeRegistered += 1;
    }

    byState[stateLoaded.state.state] += 1;
    bubbles.push({
      bubbleId,
      repoPath,
      worktreePath: getBubblePaths(repoPath, bubbleId).worktreePath,
      state: stateLoaded.state.state,
      round: stateLoaded.state.round,
      activeAgent: stateLoaded.state.active_agent,
      activeRole: stateLoaded.state.active_role,
      activeSince: stateLoaded.state.active_since,
      lastCommandAt: stateLoaded.state.last_command_at,
      runtimeSession
    });
  }

  const bubbleIdSet = new Set(bubbleIds);
  const stale = Object.keys(sessions).filter(
    (bubbleId) => !bubbleIdSet.has(bubbleId)
  ).length;

  return {
    repoPath,
    total: bubbles.length,
    byState,
    runtimeSessions: {
      registered: runtimeRegistered,
      stale
    },
    bubbles
  };
}

export function asBubbleListError(error: unknown): never {
  if (error instanceof BubbleListError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new BubbleListError(error.message);
  }
  throw error;
}
