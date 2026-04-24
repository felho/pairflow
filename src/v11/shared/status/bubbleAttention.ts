import type { BubbleLifecycleState } from "../../../types/bubble.js";
import type { UiBubbleAttention } from "../../../types/ui.js";
import type { RuntimeSessionRecord } from "../ports/runtimeSessions.js";
import type { StateValidationDiagnostics } from "../ports/stateSnapshots.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type { WatchdogStatus } from "../watchdog/watchdogStatus.js";

const quietPaneThresholdSeconds = 3 * 60;
const stalePreparingWorkspaceThresholdSeconds = 5 * 60;
const stalePreparingWorkspaceDetail =
  "This bubble is not resumable. Delete it and create a new bubble.";

const runtimeExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);
const runtimeMismatchSuppressedStates = new Set<BubbleLifecycleState>([
  "PREPARING_WORKSPACE",
  "DONE"
]);

function resolveElapsedSeconds(
  timestamp: string | null | undefined,
  now: Date
): number | null {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }
  const resolved = Date.parse(timestamp);
  if (Number.isNaN(resolved)) {
    return null;
  }
  return Math.max(0, Math.floor((now.getTime() - resolved) / 1_000));
}

function resolveTimestampMs(timestamp: string | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }
  const resolved = Date.parse(timestamp);
  if (Number.isNaN(resolved)) {
    return null;
  }
  return resolved;
}

function formatQuietMinutes(seconds: number): number {
  return Math.max(3, Math.floor(seconds / 60));
}

export function isRuntimeSessionExpectedState(
  state: BubbleLifecycleState
): boolean {
  return runtimeExpectedStates.has(state);
}

function resolveStateValidationAttention(
  stateValidation: StateValidationDiagnostics | null
): UiBubbleAttention | null {
  if (stateValidation === null) {
    return null;
  }
  return {
    code: "state_invalid",
    severity: "critical",
    label: "Invalid state",
    detail: "State snapshot validation failed and requires attention."
  };
}

function resolveRuntimeAttention(input: {
  state: BubbleLifecycleState;
  runtimeSession: RuntimeSessionRecord | null;
  runtimeExpectedOverride?: boolean;
}): UiBubbleAttention | null {
  const runtimeExpected =
    input.runtimeExpectedOverride ?? isRuntimeSessionExpectedState(input.state);
  if (runtimeExpected && input.runtimeSession === null) {
    return {
      code: "runtime_missing",
      severity: "critical",
      label: "No session",
      detail: "Runtime session is expected for the current lifecycle state, but none is registered."
    };
  }
  if (
    !runtimeExpected
    && input.runtimeSession !== null
    && !runtimeMismatchSuppressedStates.has(input.state)
  ) {
    return {
      code: "runtime_mismatch",
      severity: "warning",
      label: "Runtime mismatch",
      detail: "A runtime session is still registered outside the active runtime states."
    };
  }
  return null;
}

function resolvePreparingWorkspaceAttention(input: {
  state: BubbleLifecycleState;
  runtimeSession: RuntimeSessionRecord | null;
  referenceTimestamp: string | null | undefined;
  now: Date;
}): UiBubbleAttention | null {
  if (input.state !== "PREPARING_WORKSPACE" || input.runtimeSession !== null) {
    return null;
  }
  const preparingSeconds = resolveElapsedSeconds(input.referenceTimestamp, input.now);
  if (
    preparingSeconds === null
    || preparingSeconds < stalePreparingWorkspaceThresholdSeconds
  ) {
    return null;
  }
  return {
    code: "startup_incomplete",
    severity: "warning",
    label: "Startup incomplete",
    detail: stalePreparingWorkspaceDetail
  };
}

function resolvePaneSamplingAttention(
  paneActivityRead: ReadWatchdogPaneActivityResult
): UiBubbleAttention | null {
  if (paneActivityRead.status === "invalid") {
    return {
      code: "pane_activity_invalid",
      severity: "warning",
      label: "Pane activity invalid",
      detail: "Watchdog pane activity record is invalid and should be rebuilt."
    };
  }
  if (paneActivityRead.status !== "ok") {
    return null;
  }

  const lastSampleStatus = paneActivityRead.record.last_sample_status ?? null;
  if (lastSampleStatus === "no_session") {
    return {
      code: "no_session",
      severity: "critical",
      label: "No session",
      detail: "Active pane sampling could not find a live runtime session."
    };
  }
  if (lastSampleStatus === "pane_unreadable") {
    return {
      code: "pane_unreadable",
      severity: "warning",
      label: "Pane unreadable",
      detail: "Active pane sampling could not read the target tmux pane."
    };
  }
  return null;
}

function resolveWatchdogAttention(
  watchdog: Pick<WatchdogStatus, "expired">
): UiBubbleAttention | null {
  if (!watchdog.expired) {
    return null;
  }
  return {
    code: "watchdog_expired",
    severity: "critical",
    label: "Watchdog expired",
    detail: "The watchdog deadline passed without observed protocol activity."
  };
}

function resolveQuietPaneAttention(input: {
  state: BubbleLifecycleState;
  watchdog: Pick<WatchdogStatus, "monitored">;
  paneActivityRead: ReadWatchdogPaneActivityResult;
  now: Date;
  bubbleStartedAt?: string | null;
}): UiBubbleAttention | null {
  if (
    input.state !== "RUNNING"
    || !input.watchdog.monitored
    || input.paneActivityRead.status !== "ok"
    || input.paneActivityRead.record.last_sample_status !== "sampled"
  ) {
    return null;
  }

  const sampledAtMs = resolveTimestampMs(input.paneActivityRead.record.sampled_at);
  const bubbleStartedAtMs = resolveTimestampMs(input.bubbleStartedAt);
  if (
    sampledAtMs !== null
    && bubbleStartedAtMs !== null
    && sampledAtMs < bubbleStartedAtMs
  ) {
    return null;
  }

  const quietSeconds = resolveElapsedSeconds(
    input.paneActivityRead.record.last_changed_at,
    input.now
  );
  if (quietSeconds === null || quietSeconds < quietPaneThresholdSeconds) {
    return null;
  }

  const quietMinutes = formatQuietMinutes(quietSeconds);
  return {
    code: "quiet_pane",
    severity: "warning",
    label: `Quiet ${quietMinutes}m`,
    detail: `No pane activity was observed for ${quietMinutes} minute${quietMinutes === 1 ? "" : "s"}.`
  };
}

export function resolveBubbleAttention(input: {
  state: BubbleLifecycleState;
  runtimeSession: RuntimeSessionRecord | null;
  stateValidation: StateValidationDiagnostics | null;
  watchdog: Pick<WatchdogStatus, "expired" | "monitored" | "referenceTimestamp">;
  paneActivityRead: ReadWatchdogPaneActivityResult;
  now: Date;
  runtimeExpectedOverride?: boolean;
  bubbleStartedAt?: string | null;
}): UiBubbleAttention | null {
  return (
    resolveStateValidationAttention(input.stateValidation)
    ?? resolveRuntimeAttention({
      state: input.state,
      runtimeSession: input.runtimeSession,
      ...(input.runtimeExpectedOverride !== undefined
        ? { runtimeExpectedOverride: input.runtimeExpectedOverride }
        : {})
    })
    ?? resolvePreparingWorkspaceAttention({
      state: input.state,
      runtimeSession: input.runtimeSession,
      referenceTimestamp: input.watchdog.referenceTimestamp,
      now: input.now
    })
    ?? resolvePaneSamplingAttention(input.paneActivityRead)
    ?? resolveWatchdogAttention(input.watchdog)
    ?? resolveQuietPaneAttention({
      state: input.state,
      watchdog: input.watchdog,
      paneActivityRead: input.paneActivityRead,
      now: input.now,
      ...(input.bubbleStartedAt !== undefined
        ? { bubbleStartedAt: input.bubbleStartedAt }
        : {})
    })
  );
}
