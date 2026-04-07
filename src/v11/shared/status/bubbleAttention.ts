import type { BubbleLifecycleState } from "../../../types/bubble.js";
import type { UiBubbleAttention } from "../../../types/ui.js";
import type { RuntimeSessionRecord } from "../../../core/runtime/sessionsRegistry.js";
import type { StateValidationDiagnostics } from "../../../core/state/stateStore.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type { WatchdogStatus } from "../watchdog/watchdogStatus.js";

const quietPaneThresholdSeconds = 5 * 60;

const runtimeExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);
const runtimeMismatchSuppressedStates = new Set<BubbleLifecycleState>([
  "PREPARING_WORKSPACE"
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

function formatQuietMinutes(seconds: number): number {
  return Math.max(5, Math.floor(seconds / 60));
}

export function isRuntimeSessionExpectedState(
  state: BubbleLifecycleState
): boolean {
  return runtimeExpectedStates.has(state);
}

export function resolveBubbleAttention(input: {
  state: BubbleLifecycleState;
  runtimeSession: RuntimeSessionRecord | null;
  stateValidation: StateValidationDiagnostics | null;
  watchdog: Pick<WatchdogStatus, "expired" | "monitored">;
  paneActivityRead: ReadWatchdogPaneActivityResult;
  now: Date;
}): UiBubbleAttention | null {
  if (input.stateValidation !== null) {
    return {
      code: "state_invalid",
      severity: "critical",
      label: "Invalid state",
      detail: "State snapshot validation failed and requires attention."
    };
  }

  const runtimeExpected = isRuntimeSessionExpectedState(input.state);
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

  if (input.paneActivityRead.status === "ok") {
    const lastSampleStatus = input.paneActivityRead.record.last_sample_status ?? null;
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
  }

  if (input.paneActivityRead.status === "invalid") {
    return {
      code: "pane_activity_invalid",
      severity: "warning",
      label: "Pane activity invalid",
      detail: "Watchdog pane activity record is invalid and should be rebuilt."
    };
  }

  if (input.watchdog.expired) {
    return {
      code: "watchdog_expired",
      severity: "critical",
      label: "Watchdog expired",
      detail: "The watchdog deadline passed without observed protocol activity."
    };
  }

  if (
    input.state !== "RUNNING"
    || !input.watchdog.monitored
    || input.paneActivityRead.status !== "ok"
    || input.paneActivityRead.record.last_sample_status !== "sampled"
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
