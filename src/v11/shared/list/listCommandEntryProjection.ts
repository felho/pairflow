import type { parseBubbleConfigToml } from "../../../config/bubbleConfig.js";
import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { getBubblePaths } from "../bubble/bubblePaths.js";
import { isNamedError } from "../errors/namedError.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import { projectActiveMetaReviewRuntimeDelivery } from "../metaReview/metaReviewSnapshot.js";
import {
  buildRuntimeAlignedReviewPolicyRuntimeView,
  normalizeRuntimeAlignedExecutionContext,
  normalizeRuntimeAlignedRole,
  toRuntimeAlignedReviewPolicyExecutionContext
} from "../reviewPolicy/reviewPolicyRuntime.js";
import type { RemoteBubbleStatusSnapshot } from "../status/remoteBubbleStatusContract.js";
import { resolveBubbleAttention } from "../status/bubbleAttention.js";
import { computeWatchdogStatus } from "../watchdog/watchdogStatus.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import { inferBubbleStartedAtFromInstanceId } from "../bubble/bubbleInstanceId.js";
import type { BubbleListEntry } from "./listCommandContract.js";
import { runtimeSessionExpectedStates } from "./listCommandContext.js";
import { listCommandDefaults } from "./listCommandDefaults.js";
import { BubbleListError } from "./listCommandErrors.js";

export interface BubbleBuildResult {
  entry: BubbleListEntry;
  hasRuntimeSession: boolean;
  invalidState: boolean;
  nonRuntimeState: boolean;
  createdNotStarted: number;
  unavailableStarted: number;
}

export interface RemoteRefreshFailureMetadata {
  reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE" | "LIST_REMOTE_CACHE_WRITE_FAILED";
  refreshAttemptedAt: string;
}

export async function readRemoteStateCacheSafe(path: string): Promise<{
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

function neutralMetaReview(): BubbleListEntry["metaReview"] {
  return {
    actor: "meta-reviewer",
    authorityActive: false,
    consecutiveCleanRuns: 0,
    runtimeDelivery: null
  };
}

function cachedMetaReview(
  cache: BubbleRemoteStateCache
): BubbleListEntry["metaReview"] {
  return {
    ...neutralMetaReview(),
    consecutiveCleanRuns: cache.metaReview?.consecutiveCleanRuns ?? 0
  };
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

export function buildLocalBubbleListEntry(input: {
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
  const runtimeAlignedExecutionContext =
    toRuntimeAlignedReviewPolicyExecutionContext(
      input.stateLoaded.state.execution_context
    );
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
        now: input.now,
        bubbleStartedAt: inferBubbleStartedAtFromInstanceId(
          input.config.bubble_instance_id
        )
      }),
      reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
        config: input.config,
        round: input.stateLoaded.state.round,
        activeRole: input.stateLoaded.state.active_role,
        ...(runtimeAlignedExecutionContext !== null
          ? {
              executionContext: runtimeAlignedExecutionContext
            }
          : {}),
        runtimeStateInvalid: input.stateLoaded.stateValidation !== null
      }),
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: isMetaReviewExecutionContextActiveState(input.stateLoaded.state),
        consecutiveCleanRuns:
          input.stateLoaded.state.meta_review?.consecutive_clean_runs ?? 0,
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

export function buildCreatedRemoteBubbleListEntry(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  config: ReturnType<typeof parseBubbleConfigToml>;
  stateLoaded: Awaited<ReturnType<typeof listCommandDefaults.inspectStateSnapshot>>;
  remotePointer: Extract<BubbleRemotePointer, { kind: "created" }>;
}): BubbleBuildResult {
  const runtimeAlignedExecutionContext =
    toRuntimeAlignedReviewPolicyExecutionContext(
      input.stateLoaded.state.execution_context
    );
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
      reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
        config: input.config,
        round: input.stateLoaded.state.round,
        activeRole: input.stateLoaded.state.active_role,
        ...(runtimeAlignedExecutionContext !== null
          ? {
              executionContext: runtimeAlignedExecutionContext
            }
          : {}),
        runtimeAvailability: "inactive",
        runtimeStateInvalid: input.stateLoaded.stateValidation !== null
      }),
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

export function buildCachedRemoteBubbleListEntry(input: {
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
      reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
        config: input.config,
        round: input.cache.round,
        activeRole: null,
        runtimeAvailability: "inactive"
      }),
      metaReview: cachedMetaReview(input.cache),
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

export function buildUnavailableRemoteBubbleListEntry(input: {
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
      reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
        config: input.config,
        round: input.stateLoaded.state.round,
        activeRole: null,
        runtimeAvailability: "missing"
      }),
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
            ? { session_name: input.paneActivity.sessionName }
            : {}),
          ...(input.paneActivity.targetPane !== null
            ? { target_pane: input.paneActivity.targetPane }
            : {}),
          ...(input.paneActivity.lastSampleStatus !== null
            ? { last_sample_status: input.paneActivity.lastSampleStatus }
            : {}),
          ...(input.paneActivity.lastSampleError !== null
            ? { last_sample_error: input.paneActivity.lastSampleError }
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

export async function buildRefreshedRemoteBubbleListEntry(input: {
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
  const remoteStatusSnapshot = await listCommandDefaults.executeRemoteBubbleStatus({
    bubbleId: input.bubbleId,
    remoteClonePath: input.remotePointer.remoteClonePath,
    remoteTarget
  });
  const runtimeAlignedActiveRole = normalizeRuntimeAlignedRole(
    remoteStatusSnapshot.activeRole
  );
  const runtimeAlignedExecutionContext =
    normalizeRuntimeAlignedExecutionContext(remoteStatusSnapshot.executionContext);

  let cacheStatus: NonNullable<BubbleListEntry["remoteExecution"]>["cacheStatus"] = "present";
  let lastCacheCheckAt: string | undefined = remoteStatusSnapshot.lastCheckedAt;
  let refreshFailure: RemoteRefreshFailureMetadata | undefined;
  try {
    await listCommandDefaults.writeRemoteStateCache(input.bubblePaths.remoteStateCachePath, {
      lastCheckedAt: remoteStatusSnapshot.lastCheckedAt,
      state: remoteStatusSnapshot.state,
      round: remoteStatusSnapshot.round,
      maxRounds: input.config.max_rounds,
      metaReview: {
        consecutiveCleanRuns: remoteStatusSnapshot.metaReview.consecutiveCleanRuns
      }
    });
  } catch {
    const cacheResult = await readRemoteStateCacheSafe(
      input.bubblePaths.remoteStateCachePath
    ).catch((error) => {
      throw new BubbleListError({
        message:
          `LIST_REMOTE_REFRESH_UNAVAILABLE: Bubble ${input.bubbleId} cache fallback could not be read after refresh persistence failed.`,
        cause: error
      });
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
        runtimeExpectedOverride: false,
        bubbleStartedAt: remoteStatusSnapshot.bubbleStartedAt
      }),
      reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
        config: input.config,
        round: remoteStatusSnapshot.round,
        activeRole: runtimeAlignedActiveRole,
        ...(runtimeAlignedExecutionContext !== null
          ? {
              executionContext: runtimeAlignedExecutionContext
            }
          : {}),
        runtimeAvailability: remoteStatusSnapshot.runtimeAvailability,
        runtimeStateInvalid: remoteStatusSnapshot.stateValidation !== null
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
