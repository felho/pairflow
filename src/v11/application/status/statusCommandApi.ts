import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type { BubbleRemoteStateCache } from "../../shared/remote/remoteStateCacheTypes.js";
import { isNamedError } from "../../shared/errors/namedError.js";
import {
  countPendingHumanQuestions,
  readStatusTranscriptData,
  resolvePendingApprovalCount,
  resolveReviewVerificationState,
  resolveStatusGateState,
  withAccuracyCriticalVerificationGate
} from "./internal/computation/statusCommandInternals.js";
import {
  buildBubbleStatusView,
  type BubbleStatusView
} from "./internal/view/statusCommandViewBuilder.js";
import type {
  BubbleStatusDependencies,
  BubbleStatusInput
} from "./statusCommandContract.js";
import { isRemoteBubbleStatusErrorLike } from "../../shared/status/remoteBubbleStatusContract.js";
import type {
  ReadWatchdogPaneActivityResult
} from "../../shared/watchdog/watchdogPaneActivityStore.js";
import type { ResolvedBubbleById } from "../../ports/bubbleLookup.js";

export type { BubbleStatusView } from "./internal/view/statusCommandViewBuilder.js";

export class BubbleStatusError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleStatusError";
  }
}

async function readRemoteStateCacheSafe(input: {
  path: string;
  readRemoteStateCache: NonNullable<BubbleStatusDependencies["readRemoteStateCache"]>;
}): Promise<{
  cache: BubbleRemoteStateCache | null;
  cacheStatus: "present" | "missing" | "invalid";
}> {
  try {
    const cache = await input.readRemoteStateCache(input.path);
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

async function refreshRemoteStateCache(input: {
  path: string;
  snapshot: {
    lastCheckedAt: string;
    state: BubbleStatusView["state"];
    round: number;
  };
  maxRounds: number;
  writeRemoteStateCache: NonNullable<BubbleStatusDependencies["writeRemoteStateCache"]>;
  readRemoteStateCache: NonNullable<BubbleStatusDependencies["readRemoteStateCache"]>;
}): Promise<{
  cacheStatus: "present" | "missing" | "invalid";
  cacheReasonCode?:
    | "STATUS_REMOTE_CACHE_WRITE_FAILED"
    | "STATUS_REMOTE_CACHE_FALLBACK_READ_FAILED";
  lastCacheCheckAt?: string;
}> {
  try {
    await input.writeRemoteStateCache(input.path, {
      lastCheckedAt: input.snapshot.lastCheckedAt,
      state: input.snapshot.state,
      round: input.snapshot.round,
      maxRounds: input.maxRounds
    });
    return {
      cacheStatus: "present",
      lastCacheCheckAt: input.snapshot.lastCheckedAt
    };
  } catch {
    try {
      const cacheResult = await readRemoteStateCacheSafe({
        path: input.path,
        readRemoteStateCache: input.readRemoteStateCache
      });
      return {
        cacheStatus: cacheResult.cacheStatus,
        cacheReasonCode: "STATUS_REMOTE_CACHE_WRITE_FAILED",
        ...(cacheResult.cache?.lastCheckedAt !== undefined
          ? { lastCacheCheckAt: cacheResult.cache.lastCheckedAt }
          : {})
      };
    } catch {
      return {
        cacheStatus: "missing",
        cacheReasonCode: "STATUS_REMOTE_CACHE_FALLBACK_READ_FAILED"
      };
    }
  }
}

function resolveConfiguredRemoteAlias(input: {
  bubbleId: string;
  bubbleConfig: ResolvedBubbleById["bubbleConfig"];
}): string {
  if (input.bubbleConfig.executor?.type === "ssh") {
    return input.bubbleConfig.executor.remote;
  }
  throw new BubbleStatusError(
    `STATUS_REMOTE_STATUS_UNAVAILABLE: Bubble ${input.bubbleId} has remote execution artifacts without an ssh executor alias in bubble.toml.`
  );
}

function formatRemoteStatusUnavailableReason(error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return reason.startsWith("STATUS_REMOTE_STATUS_UNAVAILABLE:")
    ? reason
    : `STATUS_REMOTE_STATUS_UNAVAILABLE: ${reason}`;
}

async function loadStartedRemoteBubbleStatusView(input: {
  resolved: ResolvedBubbleById;
  remotePointer: Extract<BubbleRemotePointer, { kind: "started" }>;
  readRemoteStateCache: BubbleStatusDependencies["readRemoteStateCache"];
  writeRemoteStateCache: BubbleStatusDependencies["writeRemoteStateCache"];
  resolveRemoteBubbleStatusTarget:
    BubbleStatusDependencies["resolveRemoteBubbleStatusTarget"];
  executeRemoteBubbleStatus: BubbleStatusDependencies["executeRemoteBubbleStatus"];
}): Promise<BubbleStatusView> {
  const remoteAlias = resolveConfiguredRemoteAlias({
    bubbleId: input.resolved.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig
  });
  const remoteTarget = await input.resolveRemoteBubbleStatusTarget({
    bubbleId: input.resolved.bubbleId,
    remoteAlias,
    expectedHost: input.remotePointer.host
  });
  const remoteStatusSnapshot = await input.executeRemoteBubbleStatus({
    bubbleId: input.resolved.bubbleId,
    remoteClonePath: input.remotePointer.remoteClonePath,
    remoteTarget
  });
  const cacheRefresh = await refreshRemoteStateCache({
    path: input.resolved.bubblePaths.remoteStateCachePath,
    snapshot: {
      lastCheckedAt: remoteStatusSnapshot.lastCheckedAt,
      state: remoteStatusSnapshot.state,
      round: remoteStatusSnapshot.round
    },
    maxRounds: input.resolved.bubbleConfig.max_rounds,
    writeRemoteStateCache: input.writeRemoteStateCache,
    readRemoteStateCache: input.readRemoteStateCache
  });

  return buildBubbleStatusView({
    resolved: input.resolved,
    remoteStatusSnapshot,
    remoteExecution: {
      alias: remoteTarget.alias,
      host: remoteTarget.host,
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: cacheRefresh.cacheStatus,
      runtimeAvailability: remoteStatusSnapshot.runtimeAvailability,
      ...(remoteStatusSnapshot.runtimeAvailability === "missing"
        ? { reasonCode: "STATUS_REMOTE_RUNTIME_MISSING" as const }
        : {}),
      ...(cacheRefresh.cacheReasonCode !== undefined
        ? { cacheReasonCode: cacheRefresh.cacheReasonCode }
        : {}),
      remoteClonePath: input.remotePointer.remoteClonePath,
      lastLiveCheckAt: remoteStatusSnapshot.lastCheckedAt,
      ...(cacheRefresh.lastCacheCheckAt !== undefined
        ? { lastCacheCheckAt: cacheRefresh.lastCacheCheckAt }
        : {})
    }
  });
}

async function throwRemoteBubbleStatusLoadError(input: {
  error: unknown;
  resolved: ResolvedBubbleById;
  readRemoteStateCache: BubbleStatusDependencies["readRemoteStateCache"];
}): Promise<never> {
  let remoteCacheSuffix = "";
  try {
    const remoteCache = await readRemoteStateCacheSafe({
      path: input.resolved.bubblePaths.remoteStateCachePath,
      readRemoteStateCache: input.readRemoteStateCache
    });
    remoteCacheSuffix =
      remoteCache.cacheStatus === "present"
        ? `${remoteCache.cache?.lastCheckedAt !== undefined
            ? ` cache_status=present cache_last_checked_at=${remoteCache.cache.lastCheckedAt}.`
            : " cache_status=present."}`
        : ` cache_status=${remoteCache.cacheStatus}.`;
  } catch {
    remoteCacheSuffix =
      " cache_status=read_failed cache_reason=STATUS_REMOTE_CACHE_READ_FAILED.";
  }
  const reason = formatRemoteStatusUnavailableReason(input.error);
  throw new BubbleStatusError(
    `Failed to load remote status for `
    + `${input.resolved.bubbleId}: ${reason}`
    + remoteCacheSuffix
  );
}

async function buildLocalBubbleStatusView(input: {
  resolved: ResolvedBubbleById;
  now: Date;
  dependencies: BubbleStatusDependencies;
  remoteExecution?: BubbleStatusView["remoteExecution"];
}): Promise<BubbleStatusView> {
  const {
    state,
    stateValidation,
    transcript,
    inbox
  } = await readStatusTranscriptData(input.resolved, input.dependencies);
  const pendingQuestions = countPendingHumanQuestions(inbox);
  const accuracyCritical = input.resolved.bubbleConfig.accuracy_critical === true;
  const pendingApprovals =
    stateValidation === null
      ? resolvePendingApprovalCount(input.resolved, state, inbox)
      : 0;
  const verificationStatus =
    stateValidation === null
      ? await resolveReviewVerificationState(
          input.resolved,
          state,
          accuracyCritical,
          input.dependencies
        )
      : "missing";
  const gateState =
    stateValidation === null
      ? await resolveStatusGateState(
          input.resolved,
          state.round,
          input.dependencies
        )
      : {
          failingGates: [],
          specLockState: {
            state: "IMPLEMENTABLE" as const,
            open_blocker_count: 0,
            open_required_now_count: 0
          },
          roundGateState: {
            applies: false,
            violated: false,
            round: state.round
          }
        };
  if (stateValidation === null) {
    gateState.failingGates = withAccuracyCriticalVerificationGate(
      gateState.failingGates,
      accuracyCritical,
      verificationStatus
    );
  }

  const paneActivityRead: ReadWatchdogPaneActivityResult =
    await input.dependencies.readWatchdogPaneActivity({
      runtimeDir: input.resolved.bubblePaths.runtimeDir,
      bubbleId: input.resolved.bubbleId
    });

  return buildBubbleStatusView({
    resolved: input.resolved,
    state,
    transcript,
    pendingQuestions,
    pendingApprovals,
    accuracyCritical,
    verificationStatus,
    gateState,
    stateValidation,
    paneActivityRead,
    now: input.now,
    ...(input.remoteExecution !== undefined
      ? { remoteExecution: input.remoteExecution }
      : {})
  });
}

export async function getBubbleStatus(
  input: BubbleStatusInput,
  dependencies: BubbleStatusDependencies
): Promise<BubbleStatusView> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const {
    readRemotePointer,
    readRemoteStateCache,
    writeRemoteStateCache,
    resolveRemoteBubbleStatusTarget,
    executeRemoteBubbleStatus
  } = dependencies;
  const remotePointer = await readRemotePointer(resolved.bubblePaths.remotePointerPath);

  if (remotePointer?.kind === "started") {
    try {
      return await loadStartedRemoteBubbleStatusView({
        resolved,
        remotePointer,
        readRemoteStateCache,
        writeRemoteStateCache,
        resolveRemoteBubbleStatusTarget,
        executeRemoteBubbleStatus
      });
    } catch (error) {
      await throwRemoteBubbleStatusLoadError({
        error,
        resolved,
        readRemoteStateCache
      });
    }
  }

  return buildLocalBubbleStatusView({
    resolved,
    now,
    dependencies,
    ...(remotePointer?.kind === "created"
      ? {
          remoteExecution: {
            alias:
              resolved.bubbleConfig.executor?.type === "ssh"
                ? resolved.bubbleConfig.executor.remote
                : remotePointer.host,
            host: remotePointer.host,
            pointerKind: "created" as const,
            viewKind: "status" as const,
            statusSource: "created_not_started" as const,
            cacheStatus: "missing" as const,
            runtimeAvailability: "not_started" as const
          }
        }
      : {})
  });
}

export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleStatusError) {
    throw error;
  }
  if (isNamedError(error, "BubbleLookupError")) {
    throw new BubbleStatusError(
      `${error.message} context: command_name=status.`
    );
  }
  if (isRemoteBubbleStatusErrorLike(error)) {
    throw new BubbleStatusError(
      `${error.code}: ${error.message} context: command_name=status.`
    );
  }
  if (error instanceof Error) {
    throw new BubbleStatusError(
      `${error.message} context: command_name=status.`
    );
  }
  throw error;
}
