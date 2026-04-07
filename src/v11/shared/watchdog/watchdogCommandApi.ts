import {
  computeWatchdogStatus,
  type WatchdogStatus
} from "./watchdogStatus.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import {
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import { maybeApplyPendingReworkIntent } from "./watchdogPendingReworkIntent.js";
import {
  sampleWatchdogPaneActivity,
  WATCHDOG_PANE_ACTIVITY_SAMPLE_INTERVAL_MS,
  type PaneActivitySampleResult
} from "./watchdogPaneActivitySampler.js";
import {
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity,
  type ReadWatchdogPaneActivityResult,
  type WatchdogPaneActivityRecord
} from "./watchdogPaneActivityStore.js";
import {
  appendWatchdogTrace,
  type WatchdogTraceEntry
} from "./watchdogTraceStore.js";
import type {
  BubbleWatchdogDependencies,
  BubbleWatchdogInput,
  BubbleWatchdogResult
} from "../../application/watchdog/watchdogCommandContract.js";
import {
  BubbleWatchdogError,
  throwAsBubbleWatchdogError
} from "./watchdogCommandRuntime.js";
import { type WatchdogRuntimeContext } from "./watchdogCommandFlow.js";
import { resolveWatchdogLifecycleRoute } from "./watchdogCommandRouting.js";
export { BubbleWatchdogError } from "./watchdogCommandRuntime.js";

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput,
  dependencies: BubbleWatchdogDependencies = {}
): Promise<BubbleWatchdogResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const resolved = await resolveBubbleById(
    {
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    }
  );
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const recoverMetaReviewRoute =
    dependencies.recoverMetaReviewGateFromSnapshot ?? recoverMetaReviewGateFromSnapshot;
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitNotification =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;
  const readPaneActivity =
    dependencies.readWatchdogPaneActivity ?? readWatchdogPaneActivity;
  const writePaneActivity =
    dependencies.writeWatchdogPaneActivity ?? writeWatchdogPaneActivity;
  const samplePaneActivity =
    dependencies.sampleWatchdogPaneActivity ?? sampleWatchdogPaneActivity;
  const readRuntimeSessionsRegistry =
    dependencies.readRuntimeSessionsRegistry;
  const runTmux = dependencies.runTmux;
  const context: WatchdogRuntimeContext = {
    now,
    nowIso,
    resolved,
    readState,
    recoverMetaReviewRoute,
    loadedState,
    state,
    emitDelivery,
    emitNotification
  };

  const pendingRework = await maybeApplyPendingReworkIntent({
    now: context.now,
    nowIso: context.nowIso,
    resolved: context.resolved,
    loadedState: context.loadedState,
    state: context.state,
    emitDelivery: context.emitDelivery
  });
  if (pendingRework !== null) {
    await appendWatchdogTrace({
      runtimeDir: resolved.bubblePaths.runtimeDir,
      bubbleId: resolved.bubbleId,
      entry: buildWatchdogTraceEntry({
        nowIso,
        state,
        watchdog: null,
        paneActivity: null,
        result: pendingRework
      })
    });
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
  await appendWatchdogTrace({
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

function parseIsoTimestamp(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function shouldSamplePaneActivity(
  readResult: ReadWatchdogPaneActivityResult,
  now: Date,
  activeRole: "implementer" | "reviewer" | "meta_reviewer"
): boolean {
  if (readResult.status !== "ok") {
    return true;
  }
  const expectedTargetPane = resolveExpectedTargetPane(
    readResult.record.session_name,
    activeRole
  );
  if (
    expectedTargetPane !== null
    && readResult.record.target_pane !== expectedTargetPane
  ) {
    return true;
  }
  const sampledAtMs = parseIsoTimestamp(readResult.record.sampled_at);
  if (sampledAtMs === null) {
    return true;
  }
  return now.getTime() - sampledAtMs >= WATCHDOG_PANE_ACTIVITY_SAMPLE_INTERVAL_MS;
}

function resolveExpectedTargetPane(
  sessionName: string | undefined,
  activeRole: "implementer" | "reviewer" | "meta_reviewer"
): string | null {
  if (sessionName === undefined || sessionName.trim().length === 0) {
    return null;
  }
  const paneIndex =
    activeRole === "implementer"
      ? 1
      : activeRole === "reviewer"
        ? 2
        : 3;
  return `${sessionName}:0.${paneIndex}`;
}

function buildNextPaneActivityRecord(input: {
  bubbleId: string;
  previous: WatchdogPaneActivityRecord | null;
  previousReadStatus: ReadWatchdogPaneActivityResult["status"];
  sampleResult: Extract<PaneActivitySampleResult, { status: "sampled" }>;
}): WatchdogPaneActivityRecord {
  const previousChangedAtMs = parseIsoTimestamp(input.previous?.last_changed_at);
  const nextLastChangedAt =
    input.previousReadStatus !== "ok"
    || input.previous === null
    || input.sampleResult.changed
    || previousChangedAtMs === null
      ? input.sampleResult.sampled_at
      : input.previous.last_changed_at;

  return {
    bubble_id: input.bubbleId,
    sampled_at: input.sampleResult.sampled_at,
    pane_hash: input.sampleResult.pane_hash,
    last_changed_at: nextLastChangedAt,
    session_name: input.sampleResult.session_name,
    target_pane: input.sampleResult.target_pane,
    last_sample_status: "sampled"
  };
}

function buildFailedSampleRecord(input: {
  previous: WatchdogPaneActivityRecord;
  sampleResult: Extract<
    PaneActivitySampleResult,
    {
      status: "no_session" | "pane_unreadable";
    }
  >;
}): WatchdogPaneActivityRecord {
  return {
    ...input.previous,
    sampled_at: input.sampleResult.sampled_at,
    ...(input.sampleResult.status === "pane_unreadable"
      ? {
          session_name: input.sampleResult.session_name,
          target_pane: input.sampleResult.target_pane
        }
      : {}),
    last_sample_status: input.sampleResult.status,
    last_sample_error: input.sampleResult.error
  };
}

async function maybeMonitorWatchdogPaneActivity(input: {
  context: WatchdogRuntimeContext;
  monitored: boolean;
  readPaneActivity: typeof readWatchdogPaneActivity;
  writePaneActivity: typeof writeWatchdogPaneActivity;
  samplePaneActivity: typeof sampleWatchdogPaneActivity;
  readRuntimeSessionsRegistry: BubbleWatchdogDependencies["readRuntimeSessionsRegistry"];
  runTmux: BubbleWatchdogDependencies["runTmux"];
}): Promise<{
  readStatus: "ok" | "missing" | "invalid";
  currentRecord: WatchdogPaneActivityRecord | null;
  sampleResult: PaneActivitySampleResult | null;
} | null> {
  if (
    !input.monitored
    || input.context.state.active_agent === null
    || input.context.state.active_role === null
  ) {
    return null;
  }

  const readResult = await input.readPaneActivity({
    runtimeDir: input.context.resolved.bubblePaths.runtimeDir,
    bubbleId: input.context.resolved.bubbleId
  });
  let currentRecord = readResult.status === "ok" ? readResult.record : null;

  if (!shouldSamplePaneActivity(
    readResult,
    input.context.now,
    input.context.state.active_role
  )) {
    return {
      readStatus: readResult.status,
      currentRecord,
      sampleResult: null
    };
  }

  if (
    input.readRuntimeSessionsRegistry === undefined
    || input.runTmux === undefined
  ) {
    throw new BubbleWatchdogError(
      "Watchdog runtime dependencies missing: readRuntimeSessionsRegistry or runTmux."
    );
  }

  const sampleResult = await input.samplePaneActivity({
    bubbleId: input.context.resolved.bubbleId,
    bubbleConfig: input.context.resolved.bubbleConfig,
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    activeRole: input.context.state.active_role,
    ...(currentRecord !== null ? { priorPaneHash: currentRecord.pane_hash } : {}),
    now: input.context.now,
    readSessionsRegistry: input.readRuntimeSessionsRegistry,
    runner: input.runTmux
  });

  if (sampleResult.status === "sampled") {
    currentRecord = buildNextPaneActivityRecord({
      bubbleId: input.context.resolved.bubbleId,
      previous: currentRecord,
      previousReadStatus: readResult.status,
      sampleResult
    });
    await input.writePaneActivity({
      runtimeDir: input.context.resolved.bubblePaths.runtimeDir,
      bubbleId: input.context.resolved.bubbleId,
      record: currentRecord
    });
    return {
      readStatus: readResult.status,
      currentRecord,
      sampleResult
    };
  }

  if (currentRecord !== null) {
    currentRecord = buildFailedSampleRecord({
      previous: currentRecord,
      sampleResult
    });
    await input.writePaneActivity({
      runtimeDir: input.context.resolved.bubblePaths.runtimeDir,
      bubbleId: input.context.resolved.bubbleId,
      record: currentRecord
    });
  }

  return {
    readStatus: readResult.status,
    currentRecord,
    sampleResult
  };
}

function buildWatchdogTraceEntry(input: {
  nowIso: string;
  state: BubbleWatchdogResult["state"];
  watchdog: WatchdogStatus | null;
  paneActivity:
    | {
        readStatus: "ok" | "missing" | "invalid";
        currentRecord: WatchdogPaneActivityRecord | null;
        sampleResult: PaneActivitySampleResult | null;
      }
    | null;
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

function buildWatchdogTracePaneActivity(input: {
  readStatus: "ok" | "missing" | "invalid";
  currentRecord: WatchdogPaneActivityRecord | null;
  sampleResult: PaneActivitySampleResult | null;
}): NonNullable<WatchdogTraceEntry["pane_activity"]> {
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
