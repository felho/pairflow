import { join, resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../config/bubbleConfig.js";
import type {
  BubbleLifecycleState,
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import {
  RemoteBubbleStatusError,
  type RemoteBubbleStatusSnapshot
} from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
import { getBubblePaths } from "../bubble/bubblePaths.js";
import { isNamedError } from "../errors/namedError.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import { projectActiveMetaReviewRuntimeDelivery } from "../metaReview/metaReviewSnapshot.js";
import { resolveBubbleAttention } from "../status/bubbleAttention.js";
import { computeWatchdogStatus } from "../watchdog/watchdogStatus.js";
import type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListStateCounts,
  BubbleListView
} from "./listCommandContract.js";
import { listCommandDefaults } from "./listCommandDefaults.js";
import type {
  ReadWatchdogPaneActivityResult
} from "../watchdog/watchdogPaneActivityStore.js";

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

interface BubbleBuildResult {
  entry: BubbleListEntry;
  hasRuntimeSession: boolean;
  invalidState: boolean;
  nonRuntimeState: boolean;
  createdNotStarted: number;
  unavailableStarted: number;
}

interface RemoteRefreshFailureMetadata {
  reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE" | "LIST_REMOTE_CACHE_WRITE_FAILED";
  refreshAttemptedAt: string;
}

function isRefreshFallbackEligibleError(error: unknown): boolean {
  if (error instanceof RemoteBubbleStatusError) {
    return true;
  }
  return (
    error instanceof BubbleListError
    && error.message.startsWith("LIST_REMOTE_REFRESH_UNAVAILABLE:")
  );
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

function neutralMetaReview(): BubbleListEntry["metaReview"] {
  return {
    actor: "meta-reviewer",
    authorityActive: false,
    runtimeDelivery: null
  };
}

async function resolveListBubblesContext(input: BubbleListInput): Promise<{
  repoPath: string;
  bubbleIds: Awaited<ReturnType<typeof listCommandDefaults.listBubbleIds>>;
  sessions: Awaited<ReturnType<typeof listCommandDefaults.readRuntimeSessionsRegistry>>;
  normalizedRepoPath: string;
  now: Date;
}> {
  let repoPath: string;
  try {
    repoPath = await listCommandDefaults.resolveRepoPath(input);
  } catch (error) {
    if (isNamedError(error, "RepoResolutionError")) {
      throw new BubbleListError(error.message);
    }
    throw error;
  }

  const bubbleIds = await listCommandDefaults.listBubbleIds(repoPath);
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await listCommandDefaults.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  const normalizedRepoPath = await listCommandDefaults.normalizeRepoPath(repoPath);
  const now = input.now ?? new Date();
  return {
    repoPath,
    bubbleIds,
    sessions,
    normalizedRepoPath,
    now
  };
}

async function readRemoteStateCacheSafe(path: string): Promise<{
  cache: BubbleRemoteStateCache | null;
  cacheStatus: "present" | "missing" | "invalid";
}> {
  try {
    const cache = await listCommandDefaults.readRemoteStateCache(path);
    return {
      cache,
      cacheStatus: cache === null ? "missing" : "present"
    };
  } catch (error) {
    if (isNamedError(error, "SchemaValidationError")) {
      return {
        cache: null,
        cacheStatus: "invalid"
      };
    }
    throw error;
  }
}

function resolveRemoteAlias(
  config: ReturnType<typeof parseBubbleConfigToml>,
  remotePointer: BubbleRemotePointer
): string {
  return config.executor?.type === "ssh" ? config.executor.remote : remotePointer.host;
}

function resolveRefreshRemoteAlias(input: {
  bubbleId: string;
  config: ReturnType<typeof parseBubbleConfigToml>;
}): string {
  if (input.config.executor?.type === "ssh") {
    return input.config.executor.remote;
  }
  throw new BubbleListError(
    `LIST_REMOTE_REFRESH_UNAVAILABLE: Bubble ${input.bubbleId} has remote execution artifacts without an ssh executor alias in bubble.toml.`
  );
}

function buildLocalBubbleListEntry(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  sessions: Awaited<ReturnType<typeof listCommandDefaults.readRuntimeSessionsRegistry>>;
  now: Date;
  config: ReturnType<typeof parseBubbleConfigToml>;
  stateLoaded: Awaited<ReturnType<typeof listCommandDefaults.inspectStateSnapshot>>;
  paneActivityRead: Awaited<ReturnType<typeof listCommandDefaults.readWatchdogPaneActivity>>;
}): BubbleBuildResult {
  const runtimeSession = input.sessions[input.bubbleId] ?? null;
  const invalidState = runtimeSession !== null && input.stateLoaded.stateValidation !== null;
  const nonRuntimeState =
    runtimeSession !== null
    && input.stateLoaded.stateValidation === null
    && !runtimeSessionExpectedStates.has(input.stateLoaded.state.state);
  const runtimeDelivery = projectActiveMetaReviewRuntimeDelivery({
    executionContext: input.stateLoaded.state.meta_review?.execution_context,
    runtimeDelivery: input.stateLoaded.state.meta_review?.runtime_delivery
  });
  const watchdog =
    input.stateLoaded.stateValidation === null
      ? computeWatchdogStatus(
          input.stateLoaded.state,
          input.config.watchdog_timeout_minutes,
          input.now
        )
      : {
          monitored: false,
          monitoredAgent: input.stateLoaded.state.active_agent,
          timeoutMinutes: input.config.watchdog_timeout_minutes,
          referenceTimestamp:
            input.stateLoaded.state.last_command_at ?? input.stateLoaded.state.active_since,
          deadlineTimestamp: null,
          remainingSeconds: null,
          expired: false
        };

  return {
    entry: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.bubblePaths.worktreePath,
      state: input.stateLoaded.state.state,
      round: input.stateLoaded.state.round,
      activeAgent: input.stateLoaded.state.active_agent,
      activeRole: input.stateLoaded.state.active_role,
      activeSince: input.stateLoaded.state.active_since,
      lastCommandAt: input.stateLoaded.state.last_command_at,
      stateValidation: input.stateLoaded.stateValidation,
      runtimeSession,
      attention: resolveBubbleAttention({
        state: input.stateLoaded.state.state,
        runtimeSession,
        stateValidation: input.stateLoaded.stateValidation,
        watchdog,
        paneActivityRead: input.paneActivityRead,
        now: input.now
      }),
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: isMetaReviewExecutionContextActiveState(input.stateLoaded.state),
        runtimeDelivery
      }
    },
    hasRuntimeSession: runtimeSession !== null,
    invalidState,
    nonRuntimeState,
    createdNotStarted: 0,
    unavailableStarted: 0
  };
}

function buildCreatedRemoteBubbleListEntry(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  config: ReturnType<typeof parseBubbleConfigToml>;
  stateLoaded: Awaited<ReturnType<typeof listCommandDefaults.inspectStateSnapshot>>;
  remotePointer: Extract<BubbleRemotePointer, { kind: "created" }>;
}): BubbleBuildResult {
  return {
    entry: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.bubblePaths.worktreePath,
      state: input.stateLoaded.state.state,
      round: input.stateLoaded.state.round,
      activeAgent: input.stateLoaded.state.active_agent,
      activeRole: input.stateLoaded.state.active_role,
      activeSince: input.stateLoaded.state.active_since,
      lastCommandAt: input.stateLoaded.state.last_command_at,
      stateValidation: input.stateLoaded.stateValidation,
      runtimeSession: null,
      attention: null,
      metaReview: neutralMetaReview(),
      remoteExecution: {
        alias: resolveRemoteAlias(input.config, input.remotePointer),
        host: input.remotePointer.host,
        pointerKind: "created",
        viewKind: "list",
        stateSource: "created_not_started",
        cacheStatus: "missing"
      }
    },
    hasRuntimeSession: false,
    invalidState: false,
    nonRuntimeState: false,
    createdNotStarted: 1,
    unavailableStarted: 0
  };
}

function buildCachedRemoteBubbleListEntry(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  config: ReturnType<typeof parseBubbleConfigToml>;
  remotePointer: Extract<BubbleRemotePointer, { kind: "started" }>;
  cache: BubbleRemoteStateCache;
  refreshFailure?: RemoteRefreshFailureMetadata;
}): BubbleBuildResult {
  return {
    entry: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.bubblePaths.worktreePath,
      state: input.cache.state,
      round: input.cache.round,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: null,
      stateValidation: null,
      runtimeSession: null,
      attention: null,
      metaReview: neutralMetaReview(),
      remoteExecution: {
        alias: resolveRemoteAlias(input.config, input.remotePointer),
        host: input.remotePointer.host,
        pointerKind: "started",
        viewKind: "list",
        stateSource: "cache",
        cacheStatus: "present",
        remoteClonePath: input.remotePointer.remoteClonePath,
        lastCacheCheckAt: input.cache.lastCheckedAt,
        ...(input.refreshFailure !== undefined ? input.refreshFailure : {})
      }
    },
    hasRuntimeSession: false,
    invalidState: false,
    nonRuntimeState: false,
    createdNotStarted: 0,
    unavailableStarted: 0
  };
}

function buildUnavailableRemoteBubbleListEntry(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  config: ReturnType<typeof parseBubbleConfigToml>;
  stateLoaded: Awaited<ReturnType<typeof listCommandDefaults.inspectStateSnapshot>>;
  remotePointer: Extract<BubbleRemotePointer, { kind: "started" }>;
  cacheStatus: "missing" | "invalid";
  refreshFailure?: RemoteRefreshFailureMetadata;
}): BubbleBuildResult {
  return {
    entry: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.bubblePaths.worktreePath,
      state: input.stateLoaded.state.state,
      round: input.stateLoaded.state.round,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: null,
      stateValidation: null,
      runtimeSession: null,
      attention: null,
      metaReview: neutralMetaReview(),
      remoteExecution: {
        alias: resolveRemoteAlias(input.config, input.remotePointer),
        host: input.remotePointer.host,
        pointerKind: "started",
        viewKind: "list",
        stateSource: "unavailable_started",
        cacheStatus: input.cacheStatus,
        remoteClonePath: input.remotePointer.remoteClonePath,
        ...(input.refreshFailure !== undefined ? input.refreshFailure : {}),
        compatLifecyclePlaceholder: {
          state: input.stateLoaded.state.state,
          round: input.stateLoaded.state.round,
          source: "local_control_plane_compat"
        }
      }
    },
    hasRuntimeSession: false,
    invalidState: false,
    nonRuntimeState: false,
    createdNotStarted: 0,
    unavailableStarted: 1
  };
}

function toRemotePaneActivityRead(input: {
  bubbleId: string;
  paneActivity: RemoteBubbleStatusSnapshot["paneActivity"];
}): ReadWatchdogPaneActivityResult {
  return input.paneActivity.readStatus === "ok"
    ? {
        status: "ok",
        record: {
          bubble_id: input.bubbleId,
          sampled_at: input.paneActivity.sampledAt ?? "",
          pane_hash: "remote-list-refresh",
          last_changed_at: input.paneActivity.lastChangedAt ?? "",
          ...(input.paneActivity.sessionName !== null
            ? {
                session_name: input.paneActivity.sessionName
              }
            : {}),
          ...(input.paneActivity.targetPane !== null
            ? { target_pane: input.paneActivity.targetPane }
            : {}),
          ...(input.paneActivity.lastSampleStatus !== null
            ? {
                last_sample_status: input.paneActivity.lastSampleStatus
              }
            : {}),
          ...(input.paneActivity.lastSampleError !== null
            ? {
                last_sample_error: input.paneActivity.lastSampleError
              }
            : {})
        }
      }
    : input.paneActivity.readStatus === "invalid"
      ? {
          status: "invalid",
          error: input.paneActivity.lastSampleError ?? "Invalid pane activity"
        }
      : {
          status: "missing"
        };
}

async function buildRefreshedRemoteBubbleListEntry(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  config: ReturnType<typeof parseBubbleConfigToml>;
  remotePointer: Extract<BubbleRemotePointer, { kind: "started" }>;
  now: Date;
}): Promise<BubbleBuildResult> {
  const refreshAttemptedAt = input.now.toISOString();
  const remoteTarget = await listCommandDefaults.resolveRemoteBubbleStatusTarget({
    bubbleId: input.bubbleId,
    remoteAlias: resolveRefreshRemoteAlias({
      bubbleId: input.bubbleId,
      config: input.config
    }),
    expectedHost: input.remotePointer.host
  });
  const remoteStatusSnapshot = await listCommandDefaults.executeRemoteBubbleStatus(
    {
      bubbleId: input.bubbleId,
      remoteClonePath: input.remotePointer.remoteClonePath,
      remoteTarget
    }
  );
  let cacheStatus: NonNullable<BubbleListEntry["remoteExecution"]>["cacheStatus"] = "present";
  let lastCacheCheckAt: string | undefined = remoteStatusSnapshot.lastCheckedAt;
  let refreshFailure: RemoteRefreshFailureMetadata | undefined;
  try {
    await listCommandDefaults.writeRemoteStateCache(
      input.bubblePaths.remoteStateCachePath,
      {
        lastCheckedAt: remoteStatusSnapshot.lastCheckedAt,
        state: remoteStatusSnapshot.state,
        round: remoteStatusSnapshot.round,
        maxRounds: input.config.max_rounds
      }
    );
  } catch {
    const cacheResult = await readRemoteStateCacheSafe(
      input.bubblePaths.remoteStateCachePath
    ).catch((error) => {
      throw new BubbleListError(
        {
          message:
            `LIST_REMOTE_REFRESH_UNAVAILABLE: Bubble ${input.bubbleId} cache fallback could not be read after refresh persistence failed.`,
          cause: error
        }
      );
    });
    cacheStatus = cacheResult.cacheStatus;
    lastCacheCheckAt = undefined;
    refreshFailure = {
      reasonCode: "LIST_REMOTE_CACHE_WRITE_FAILED",
      refreshAttemptedAt
    };
  }

  return {
    entry: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.bubblePaths.worktreePath,
      state: remoteStatusSnapshot.state,
      round: remoteStatusSnapshot.round,
      activeAgent: remoteStatusSnapshot.activeAgent,
      activeRole: remoteStatusSnapshot.activeRole,
      activeSince: remoteStatusSnapshot.activeSince,
      lastCommandAt: remoteStatusSnapshot.lastCommandAt,
      stateValidation: remoteStatusSnapshot.stateValidation,
      runtimeSession: null,
      attention: resolveBubbleAttention({
        state: remoteStatusSnapshot.state,
        runtimeSession: null,
        stateValidation: remoteStatusSnapshot.stateValidation,
        watchdog: remoteStatusSnapshot.watchdog,
        paneActivityRead: toRemotePaneActivityRead({
          bubbleId: input.bubbleId,
          paneActivity: remoteStatusSnapshot.paneActivity
        }),
        now: input.now,
        runtimeExpectedOverride: false
      }),
      metaReview: remoteStatusSnapshot.metaReview,
      remoteExecution: {
        alias: remoteTarget.alias,
        host: remoteTarget.host,
        pointerKind: "started",
        viewKind: "list",
        stateSource: "refresh",
        cacheStatus,
        ...(refreshFailure !== undefined ? refreshFailure : {}),
        runtimeAvailability: remoteStatusSnapshot.runtimeAvailability,
        // Preserve both signals when live runtime-loss was confirmed but cache persistence failed:
        // the live read still proved runtime state, while the local cache write reported a separate
        // post-refresh persistence problem.
        ...(remoteStatusSnapshot.runtimeAvailability === "missing"
          ? { runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING" as const }
          : {}),
        remoteClonePath: input.remotePointer.remoteClonePath,
        lastLiveCheckAt: remoteStatusSnapshot.lastCheckedAt,
        ...(lastCacheCheckAt !== undefined ? { lastCacheCheckAt } : {})
      }
    },
    hasRuntimeSession: false,
    invalidState: false,
    nonRuntimeState: false,
    createdNotStarted: 0,
    unavailableStarted: 0
  };
}

async function buildBubbleListEntry(input: {
  repoPath: string;
  normalizedRepoPath: string;
  bubbleId: string;
  sessions: Awaited<ReturnType<typeof listCommandDefaults.readRuntimeSessionsRegistry>>;
  now: Date;
  refresh: boolean;
}): Promise<BubbleBuildResult> {
  const bubblePaths = getBubblePaths(input.repoPath, input.bubbleId);
  const [bubbleToml, stateLoaded, paneActivityRead, remotePointer] = await Promise.all([
    listCommandDefaults.readBubbleTomlArtifact(bubblePaths.bubbleTomlPath),
    listCommandDefaults.inspectStateSnapshot(bubblePaths.statePath),
    listCommandDefaults.readWatchdogPaneActivity({
      runtimeDir: bubblePaths.runtimeDir,
      bubbleId: input.bubbleId
    }),
    listCommandDefaults.readRemotePointer(bubblePaths.remotePointerPath)
  ]);

  const config = parseBubbleConfigToml(bubbleToml);
  if (config.id !== input.bubbleId) {
    throw new BubbleListError(
      `Bubble config id mismatch: expected ${input.bubbleId}, found ${config.id}`
    );
  }

  const normalizedConfigRepoPath = await listCommandDefaults.normalizeRepoPath(
    resolve(config.repo_path)
  );
  if (normalizedConfigRepoPath !== input.normalizedRepoPath) {
    throw new BubbleListError(
      `Bubble ${input.bubbleId} belongs to different repository path: ${config.repo_path}`
    );
  }

  if (remotePointer === null) {
    return buildLocalBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths,
      sessions: input.sessions,
      now: input.now,
      config,
      stateLoaded,
      paneActivityRead
    });
  }

  if (remotePointer.kind === "created") {
    return buildCreatedRemoteBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths,
      config,
      stateLoaded,
      remotePointer
    });
  }

  const cacheResult = await readRemoteStateCacheSafe(
    bubblePaths.remoteStateCachePath
  );
  if (input.refresh) {
    const refreshFailure: RemoteRefreshFailureMetadata = {
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
      refreshAttemptedAt: input.now.toISOString()
    };
    try {
      return await buildRefreshedRemoteBubbleListEntry({
        repoPath: input.repoPath,
        bubbleId: input.bubbleId,
        bubblePaths,
        config,
        remotePointer,
        now: input.now
      });
    } catch (error) {
      if (!isRefreshFallbackEligibleError(error)) {
        throw error;
      }
      if (cacheResult.cache !== null) {
        return buildCachedRemoteBubbleListEntry({
          repoPath: input.repoPath,
          bubbleId: input.bubbleId,
          bubblePaths,
          config,
          remotePointer,
          cache: cacheResult.cache,
          refreshFailure
        });
      }
      return buildUnavailableRemoteBubbleListEntry({
        repoPath: input.repoPath,
        bubbleId: input.bubbleId,
        bubblePaths,
        config,
        stateLoaded,
        remotePointer,
        cacheStatus:
          cacheResult.cacheStatus === "invalid" ? "invalid" : "missing",
        refreshFailure
      });
    }
  }

  if (cacheResult.cache !== null) {
    return buildCachedRemoteBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths,
      config,
      remotePointer,
      cache: cacheResult.cache
    });
  }

  return buildUnavailableRemoteBubbleListEntry({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubblePaths,
    config,
    stateLoaded,
    remotePointer,
    cacheStatus:
      cacheResult.cacheStatus === "invalid" ? "invalid" : "missing"
  });
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
  let createdNotStarted = 0;
  let unavailableStarted = 0;

  for (const bubbleId of bubbleIds) {
    const built = await buildBubbleListEntry({
      repoPath,
      normalizedRepoPath,
      bubbleId,
      sessions,
      now,
      refresh: input.refresh ?? false
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
    createdNotStarted += built.createdNotStarted;
    unavailableStarted += built.unavailableStarted;
    if (built.entry.remoteExecution?.stateSource !== "unavailable_started") {
      byState[built.entry.state] += 1;
    }
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
    bubbles,
    ...(
      bubbles.some((bubble) => bubble.remoteExecution !== undefined)
        ? {
            remoteExecutionSummary: {
              createdNotStarted,
              unavailableStarted,
              ...(bubbles.some(
                (bubble) => bubble.remoteExecution?.stateSource === "refresh"
              )
                ? { refreshedThisRun: true }
                : {})
            }
          }
        : {}
    )
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
        source: isNamedError(error, "RepoResolutionError")
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
