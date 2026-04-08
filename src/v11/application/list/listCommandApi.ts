import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../config/bubbleConfig.js";
import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "../../../core/bubble/repoResolution.js";
import { inspectStateSnapshot } from "../../../core/state/stateStore.js";
import { readRuntimeSessionsRegistry } from "../../../core/runtime/sessionsRegistry.js";
import { readWatchdogPaneActivity } from "../../../core/watchdog/watchdogPaneActivityStore.js";
import { isMetaReviewExecutionContextActiveState } from "../../shared/metaReview/metaReviewExecutionContext.js";
import { resolveActiveMetaReviewRuntimeDelivery } from "../../shared/metaReview/metaReviewSnapshot.js";
import { getBubblePaths } from "../../shared/bubble/bubblePaths.js";
import { computeWatchdogStatus } from "../../shared/watchdog/watchdogStatus.js";
import { resolveBubbleAttention } from "../../shared/status/bubbleAttention.js";
import type { BubbleLifecycleState } from "../../../types/bubble.js";
import type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListStateCounts,
  BubbleListView
} from "./listCommandContract.js";

export type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListStateCounts,
  BubbleListView
} from "./listCommandContract.js";

export interface BubbleListErrorContext {
  source: "repo_resolution" | "unexpected_error";
  repoPathProvided: boolean;
  cwdProvided: boolean;
  causeName?: string | undefined;
}

export interface BubbleListErrorInput {
  message: string;
  cause?: unknown;
  context?: BubbleListErrorContext | undefined;
}

export interface BubbleListErrorNormalizationContext {
  repoPathProvided: boolean;
  cwdProvided: boolean;
}

export class BubbleListError extends Error {
  public readonly context: BubbleListErrorContext | undefined;

  public constructor(input: string | BubbleListErrorInput) {
    const normalized =
      typeof input === "string"
        ? { message: input, cause: undefined, context: undefined }
        : input;
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleListError";
    this.context = normalized.context;
  }
}

function createZeroCounts(): BubbleListStateCounts {
  return {
    CREATED: 0,
    PREPARING_WORKSPACE: 0,
    RUNNING: 0,
    WAITING_HUMAN: 0,
    READY_FOR_HUMAN_APPROVAL: 0,
    APPROVED_FOR_COMMIT: 0,
    COMMITTED: 0,
    DONE: 0,
    FAILED: 0,
    CANCELLED: 0
  };
}

const runtimeSessionExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

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

async function resolveListBubblesContext(input: BubbleListInput): Promise<{
  repoPath: string;
  bubbleIds: string[];
  sessions: Awaited<ReturnType<typeof readRuntimeSessionsRegistry>>;
  normalizedRepoPath: string;
  now: Date;
}> {
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
  const now = input.now ?? new Date();
  return {
    repoPath,
    bubbleIds,
    sessions,
    normalizedRepoPath,
    now
  };
}

async function buildBubbleListEntry(input: {
  repoPath: string;
  normalizedRepoPath: string;
  bubbleId: string;
  sessions: Awaited<ReturnType<typeof readRuntimeSessionsRegistry>>;
  now: Date;
}): Promise<{
  entry: BubbleListEntry;
  hasRuntimeSession: boolean;
  invalidState: boolean;
  nonRuntimeState: boolean;
}> {
  const bubblePaths = getBubblePaths(input.repoPath, input.bubbleId);
  const [bubbleToml, stateLoaded, paneActivityRead] = await Promise.all([
    readFile(bubblePaths.bubbleTomlPath, "utf8"),
    inspectStateSnapshot(bubblePaths.statePath),
    readWatchdogPaneActivity({
      runtimeDir: bubblePaths.runtimeDir,
      bubbleId: input.bubbleId
    })
  ]);

  const config = parseBubbleConfigToml(bubbleToml);
  if (config.id !== input.bubbleId) {
    throw new BubbleListError(
      `Bubble config id mismatch: expected ${input.bubbleId}, found ${config.id}`
    );
  }

  const normalizedConfigRepoPath = await normalizeRepoPath(resolve(config.repo_path));
  if (normalizedConfigRepoPath !== input.normalizedRepoPath) {
    throw new BubbleListError(
      `Bubble ${input.bubbleId} belongs to different repository path: ${config.repo_path}`
    );
  }

  const runtimeSession = input.sessions[input.bubbleId] ?? null;
  const invalidState = runtimeSession !== null && stateLoaded.stateValidation !== null;
  const nonRuntimeState =
    runtimeSession !== null &&
    stateLoaded.stateValidation === null &&
    !runtimeSessionExpectedStates.has(stateLoaded.state.state);
  const activeRuntimeDelivery = resolveActiveMetaReviewRuntimeDelivery({
    executionContext: stateLoaded.state.meta_review?.execution_context,
    runtimeDelivery: stateLoaded.state.meta_review?.runtime_delivery
  });
  const watchdog =
    stateLoaded.stateValidation === null
      ? computeWatchdogStatus(
          stateLoaded.state,
          config.watchdog_timeout_minutes,
          input.now
        )
      : {
          monitored: false,
          monitoredAgent: stateLoaded.state.active_agent,
          timeoutMinutes: config.watchdog_timeout_minutes,
          referenceTimestamp:
            stateLoaded.state.last_command_at ?? stateLoaded.state.active_since,
          deadlineTimestamp: null,
          remainingSeconds: null,
          expired: false
        };

  return {
    entry: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: bubblePaths.worktreePath,
      state: stateLoaded.state.state,
      round: stateLoaded.state.round,
      activeAgent: stateLoaded.state.active_agent,
      activeRole: stateLoaded.state.active_role,
      activeSince: stateLoaded.state.active_since,
      lastCommandAt: stateLoaded.state.last_command_at,
      stateValidation: stateLoaded.stateValidation,
      runtimeSession,
      attention: resolveBubbleAttention({
        state: stateLoaded.state.state,
        runtimeSession,
        stateValidation: stateLoaded.stateValidation,
        watchdog,
        paneActivityRead,
        now: input.now
      }),
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: isMetaReviewExecutionContextActiveState(stateLoaded.state),
        latestRecommendation:
          stateLoaded.state.meta_review?.last_autonomous_recommendation ?? null,
        latestStatus: stateLoaded.state.meta_review?.last_autonomous_status ?? null,
        latestSummary: stateLoaded.state.meta_review?.last_autonomous_summary ?? null,
        latestReportRef:
          stateLoaded.state.meta_review?.last_autonomous_report_ref ?? null,
        latestUpdatedAt:
          stateLoaded.state.meta_review?.last_autonomous_updated_at ?? null,
        runtimeDelivery:
          activeRuntimeDelivery === null
            ? null
            : {
                status: activeRuntimeDelivery.status,
                reasonCode: activeRuntimeDelivery.reason_code,
                message: activeRuntimeDelivery.message,
                observedAt: activeRuntimeDelivery.observed_at,
                observedForHandoffId: activeRuntimeDelivery.observed_for_handoff_id,
                observedForRound: activeRuntimeDelivery.observed_for_round
              }
      }
    },
    hasRuntimeSession: runtimeSession !== null,
    invalidState,
    nonRuntimeState
  };
}

export async function listBubbles(input: BubbleListInput = {}): Promise<BubbleListView> {
  const {
    repoPath,
    bubbleIds,
    sessions,
    normalizedRepoPath,
    now
  } = await resolveListBubblesContext(input);

  const bubbles: BubbleListEntry[] = [];
  const byState = createZeroCounts();
  let runtimeRegistered = 0;
  let staleForNonRuntimeStates = 0;
  let staleForInvalidStates = 0;

  for (const bubbleId of bubbleIds) {
    const built = await buildBubbleListEntry({
      repoPath,
      normalizedRepoPath,
      bubbleId,
      sessions,
      now
    });
    if (built.hasRuntimeSession) {
      if (built.invalidState) {
        staleForInvalidStates += 1;
      } else if (runtimeSessionExpectedStates.has(built.entry.state)) {
        runtimeRegistered += 1;
      } else if (built.nonRuntimeState) {
        staleForNonRuntimeStates += 1;
      }
    }
    byState[built.entry.state] += 1;
    bubbles.push(built.entry);
  }

  const bubbleIdSet = new Set(bubbleIds);
  const staleMissingBubble = Object.keys(sessions).filter(
    (bubbleId) => !bubbleIdSet.has(bubbleId)
  ).length;
  const stale = staleMissingBubble + staleForNonRuntimeStates + staleForInvalidStates;

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

export function asBubbleListError(
  error: unknown,
  context: BubbleListErrorNormalizationContext
): never {
  if (error instanceof BubbleListError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new BubbleListError({
      message: error.message,
      cause: error,
      context: {
        source: error instanceof RepoResolutionError
          ? "repo_resolution"
          : "unexpected_error",
        repoPathProvided: context.repoPathProvided,
        cwdProvided: context.cwdProvided,
        causeName: error.name
      }
    });
  }
  throw error;
}
