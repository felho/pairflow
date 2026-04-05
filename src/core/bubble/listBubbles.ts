import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../config/bubbleConfig.js";
import { resolveActiveMetaReviewRuntimeDelivery } from "./metaReview.js";
import { isMetaReviewExecutionContextActiveState } from "./metaReviewExecutionContext.js";
import {
  inspectStateSnapshot,
  type StateValidationDiagnostics
} from "../state/stateStore.js";
import { readRuntimeSessionsRegistry } from "../runtime/sessionsRegistry.js";
import { computeWatchdogStatus } from "../runtime/watchdog.js";
import { resolveBubbleAttention } from "../ui/bubbleAttention.js";
import { getBubblePaths } from "./paths.js";
import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "./repoResolution.js";
import { readWatchdogPaneActivity } from "../../v11/shared/watchdog/watchdogPaneActivityStore.js";
import type { BubbleLifecycleState } from "../../types/bubble.js";
import type { RuntimeSessionRecord } from "../runtime/sessionsRegistry.js";
import type {
  MetaReviewRuntimeDeliveryStatus,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
import type { UiBubbleAttention } from "../../types/ui.js";

export interface BubbleListInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
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
  stateValidation: StateValidationDiagnostics | null;
  runtimeSession: RuntimeSessionRecord | null;
  attention: UiBubbleAttention | null;
  metaReview: {
    actor: "meta-reviewer";
    authorityActive: boolean;
    latestRecommendation: MetaReviewRecommendation | null;
    latestStatus: MetaReviewRunStatus | null;
    latestSummary: string | null;
    latestReportRef: string | null;
    latestUpdatedAt: string | null;
    runtimeDelivery: {
      status: MetaReviewRuntimeDeliveryStatus;
      reasonCode: string | null;
      message: string;
      observedAt: string;
      observedForHandoffId: string | null;
      observedForRound: number | null;
    } | null;
  };
}

export interface BubbleListStateCounts {
  CREATED: number;
  PREPARING_WORKSPACE: number;
  RUNNING: number;
  WAITING_HUMAN: number;
  READY_FOR_HUMAN_APPROVAL: number;
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
  const now = input.now ?? new Date();

  const bubbles: BubbleListEntry[] = [];
  const byState = createZeroCounts();
  let runtimeRegistered = 0;
  let staleForNonRuntimeStates = 0;
  let staleForInvalidStates = 0;

  for (const bubbleId of bubbleIds) {
    const bubblePaths = getBubblePaths(repoPath, bubbleId);

    const [bubbleToml, stateLoaded, paneActivityRead] = await Promise.all([
      readFile(bubblePaths.bubbleTomlPath, "utf8"),
      inspectStateSnapshot(bubblePaths.statePath),
      readWatchdogPaneActivity({
        runtimeDir: bubblePaths.runtimeDir,
        bubbleId
      })
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
      if (stateLoaded.stateValidation !== null) {
        staleForInvalidStates += 1;
      } else if (runtimeSessionExpectedStates.has(stateLoaded.state.state)) {
        runtimeRegistered += 1;
      } else {
        staleForNonRuntimeStates += 1;
      }
    }

    const activeRuntimeDelivery = resolveActiveMetaReviewRuntimeDelivery({
      executionContext: stateLoaded.state.meta_review?.execution_context,
      runtimeDelivery: stateLoaded.state.meta_review?.runtime_delivery
    });
    const watchdog =
      stateLoaded.stateValidation === null
        ? computeWatchdogStatus(
            stateLoaded.state,
            config.watchdog_timeout_minutes,
            now
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
    byState[stateLoaded.state.state] += 1;
    bubbles.push({
      bubbleId,
      repoPath,
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
        now
      }),
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: isMetaReviewExecutionContextActiveState(
          stateLoaded.state
        ),
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
    });
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

export function asBubbleListError(error: unknown): never {
  if (error instanceof BubbleListError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new BubbleListError(error.message);
  }
  throw error;
}
