import {
  computeWatchdogStatus,
  type WatchdogStatus
} from "../../shared/watchdog/watchdogStatus.js";
import { maybeApplyPendingReworkIntent } from "./watchdogPendingReworkIntent.js";
import { sampleWatchdogPaneActivity } from "./watchdogPaneActivitySampler.js";
import type { AppendWatchdogTracePort } from "../../ports/watchdogTrace.js";
import type { WatchdogTraceEntry } from "../../ports/watchdogTrace.js";
import type {
  BubbleWatchdogDependencies,
  BubbleWatchdogInput,
  BubbleWatchdogResult
} from "./watchdogCommandContract.js";
import {
  throwAsBubbleWatchdogError
} from "./internal/error/watchdogCommandRuntime.js";
import { type WatchdogRuntimeContext } from "./internal/flow/watchdogCommandFlow.js";
import { resolveWatchdogLifecycleRoute } from "./internal/flow/watchdogCommandRouting.js";
import {
  maybeMonitorWatchdogPaneActivity,
  type WatchdogPaneActivityState
} from "./watchdogPaneActivityMonitoring.js";
export { BubbleWatchdogError } from "./internal/error/watchdogCommandRuntime.js";

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput,
  dependencies: BubbleWatchdogDependencies
): Promise<BubbleWatchdogResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const resolved = await dependencies.resolveBubbleById(
    {
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    }
  );
  const readState = dependencies.readStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope;
  const writeState = dependencies.writeStateSnapshot;
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const emitDelivery = dependencies.emitDeliveryNotificationAck;
  const emitNotification = dependencies.emitBubbleNotification;
  const readPaneActivity = dependencies.readWatchdogPaneActivity;
  const writePaneActivity = dependencies.writeWatchdogPaneActivity;
  const appendTrace: AppendWatchdogTracePort = dependencies.appendWatchdogTrace;
  const samplePaneActivity =
    dependencies.sampleWatchdogPaneActivity ?? sampleWatchdogPaneActivity;
  const readRuntimeSessionsRegistry = dependencies.readRuntimeSessionsRegistry;
  const runTmux = dependencies.runTmux;
  const ensureBubbleInstanceIdForMutation =
    dependencies.ensureBubbleInstanceIdForMutation;
  const resolveDeliveryMessageRef = dependencies.resolveDeliveryMessageRef;
  const retryStuckAgentInput = dependencies.retryStuckAgentInput;
  const context: WatchdogRuntimeContext = {
    now,
    nowIso,
    resolved,
    readState,
    appendEnvelope,
    writeState,
    loadedState,
    state,
    emitDelivery,
    emitNotification,
    resolveDeliveryMessageRef,
    retryStuckAgentInput
  };

  const pendingRework = await tryApplyPendingReworkIntent({
    context,
    appendTrace,
    ensureBubbleInstanceIdForMutation,
    resolveDeliveryMessageRef
  });
  if (pendingRework !== null) {
    return pendingRework;
  }

  const watchdog = computeWatchdogStatus(
    state,
    resolved.bubbleConfig.watchdog_timeout_minutes,
    now
  );
  const paneActivity = await maybeMonitorWatchdogPaneActivity({
    context,
    monitored: watchdog.monitored,
    readPaneActivity,
    writePaneActivity,
    samplePaneActivity,
    readRuntimeSessionsRegistry,
    runTmux
  });
  const result = await resolveWatchdogLifecycleRoute({
    context,
    monitored: watchdog.monitored,
    expired: watchdog.expired,
    paneActivity
  });
  await appendTrace({
    runtimeDir: resolved.bubblePaths.runtimeDir,
    bubbleId: resolved.bubbleId,
    entry: buildWatchdogTraceEntry({
      nowIso,
      state,
      watchdog,
      paneActivity,
      result
    })
  });
  return result;
}

export function asBubbleWatchdogError(error: unknown): never {
  return throwAsBubbleWatchdogError(error);
}

async function tryApplyPendingReworkIntent(input: {
  context: WatchdogRuntimeContext;
  appendTrace: AppendWatchdogTracePort;
  ensureBubbleInstanceIdForMutation: NonNullable<
    BubbleWatchdogDependencies["ensureBubbleInstanceIdForMutation"]
  >;
  resolveDeliveryMessageRef: NonNullable<
    BubbleWatchdogDependencies["resolveDeliveryMessageRef"]
  >;
}): Promise<BubbleWatchdogResult | null> {
  const pendingRework = await maybeApplyPendingReworkIntent({
    now: input.context.now,
    nowIso: input.context.nowIso,
    resolved: input.context.resolved,
    loadedState: input.context.loadedState,
    state: input.context.state,
    writeState: input.context.writeState,
    emitDelivery: input.context.emitDelivery,
    ensureBubbleInstanceIdForMutation: input.ensureBubbleInstanceIdForMutation,
    resolveDeliveryMessageRef: input.resolveDeliveryMessageRef
  });
  if (pendingRework === null) {
    return null;
  }

  await input.appendTrace({
    runtimeDir: input.context.resolved.bubblePaths.runtimeDir,
    bubbleId: input.context.resolved.bubbleId,
    entry: buildWatchdogTraceEntry({
      nowIso: input.context.nowIso,
      state: input.context.state,
      watchdog: null,
      paneActivity: null,
      result: pendingRework
    })
  });
  return pendingRework;
}

function buildWatchdogTraceEntry(input: {
  nowIso: string;
  state: BubbleWatchdogResult["state"];
  watchdog: WatchdogStatus | null;
  paneActivity: WatchdogPaneActivityState | null;
  result: BubbleWatchdogResult;
}): WatchdogTraceEntry {
  return {
    ts: input.nowIso,
    bubble_id: input.state.bubble_id,
    state: input.state.state,
    active_agent: input.state.active_agent,
    active_role: input.state.active_role,
    ...(input.watchdog !== null
      ? {
          watchdog: {
            monitored: input.watchdog.monitored,
            expired: input.watchdog.expired,
            timeout_minutes: input.watchdog.timeoutMinutes,
            reference_timestamp: input.watchdog.referenceTimestamp,
            deadline_timestamp: input.watchdog.deadlineTimestamp
          }
        }
      : {}),
    ...(input.paneActivity !== null
      ? {
          pane_activity: buildWatchdogTracePaneActivity(input.paneActivity)
        }
      : {}),
    result: {
      escalated: input.result.escalated,
      reason: input.result.reason,
      state: input.result.state.state,
      ...(input.result.sequence !== undefined
        ? { sequence: input.result.sequence }
        : {})
    }
  };
}

function buildWatchdogTracePaneActivity(
  input: WatchdogPaneActivityState
): NonNullable<WatchdogTraceEntry["pane_activity"]> {
  const sampleResult = input.sampleResult;
  if (sampleResult === null) {
    return {
      read_status: input.readStatus,
      sample_status: "skipped",
      ...(input.currentRecord !== null
        ? {
            current_sampled_at: input.currentRecord.sampled_at,
            current_last_changed_at: input.currentRecord.last_changed_at,
            ...(input.currentRecord.last_sample_status !== undefined
              ? {
                  current_last_sample_status: input.currentRecord.last_sample_status
                }
              : {})
          }
        : {})
    };
  }

  if (sampleResult.status === "sampled") {
    return {
      read_status: input.readStatus,
      sample_status: "sampled",
      changed: sampleResult.changed,
      sampled_at: sampleResult.sampled_at,
      pane_hash: sampleResult.pane_hash,
      session_name: sampleResult.session_name,
      target_pane: sampleResult.target_pane,
      ...(input.currentRecord !== null
        ? {
            current_sampled_at: input.currentRecord.sampled_at,
            current_last_changed_at: input.currentRecord.last_changed_at,
            ...(input.currentRecord.last_sample_status !== undefined
              ? {
                  current_last_sample_status: input.currentRecord.last_sample_status
                }
              : {})
          }
        : {})
    };
  }

  return {
    read_status: input.readStatus,
    sample_status: sampleResult.status,
    sampled_at: sampleResult.sampled_at,
    sample_error: sampleResult.error,
    ...(sampleResult.status === "pane_unreadable"
      ? {
          session_name: sampleResult.session_name,
          target_pane: sampleResult.target_pane
        }
      : {}),
    ...(input.currentRecord !== null
      ? {
          current_sampled_at: input.currentRecord.sampled_at,
          current_last_changed_at: input.currentRecord.last_changed_at,
          ...(input.currentRecord.last_sample_status !== undefined
            ? {
                current_last_sample_status: input.currentRecord.last_sample_status
              }
            : {})
        }
      : {})
  };
}
