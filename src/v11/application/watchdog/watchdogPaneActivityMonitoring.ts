import type {
  BubbleWatchdogDependencies
} from "./watchdogCommandContract.js";
import type { AgentRole } from "../../../types/bubble.js";
import { BubbleWatchdogError } from "./watchdogCommandRuntime.js";
import { type WatchdogRuntimeContext } from "./watchdogCommandFlow.js";
import type { sampleWatchdogPaneActivity } from "./watchdogPaneActivitySampler.js";
import {
  resolveWatchdogTargetPaneIndex
} from "../../shared/watchdog/watchdogPaneTargeting.js";
import {
  WATCHDOG_PANE_ACTIVITY_SAMPLE_INTERVAL_MS,
  type PaneActivitySampleResult
} from "./watchdogPaneActivitySampler.js";
import type {
  ReadWatchdogPaneActivityPort,
  ReadWatchdogPaneActivityResult,
  WatchdogPaneActivityRecord,
  WriteWatchdogPaneActivityPort
} from "../../ports/watchdogPaneActivity.js";

export interface WatchdogPaneActivityState {
  readStatus: "ok" | "missing" | "invalid";
  currentRecord: WatchdogPaneActivityRecord | null;
  sampleResult: PaneActivitySampleResult | null;
}

function parseIsoTimestamp(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveExpectedTargetPane(
  sessionName: string | undefined,
  activeRole: AgentRole
): string | null {
  if (sessionName === undefined || sessionName.trim().length === 0) {
    return null;
  }
  return `${sessionName}:0.${String(resolveWatchdogTargetPaneIndex(activeRole))}`;
}

function shouldSamplePaneActivity(
  readResult: ReadWatchdogPaneActivityResult,
  now: Date,
  activeRole: AgentRole
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

export async function maybeMonitorWatchdogPaneActivity(input: {
  context: WatchdogRuntimeContext;
  monitored: boolean;
  readPaneActivity: ReadWatchdogPaneActivityPort;
  writePaneActivity: WriteWatchdogPaneActivityPort;
  samplePaneActivity: typeof sampleWatchdogPaneActivity;
  readRuntimeSessionsRegistry: BubbleWatchdogDependencies["readRuntimeSessionsRegistry"];
  runTmux: BubbleWatchdogDependencies["runTmux"];
}): Promise<WatchdogPaneActivityState | null> {
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
