import type { BubbleLifecycleState, BubbleStateSnapshot } from "../../types/bubble.js";

export interface WatchdogStatus {
  monitored: boolean;
  monitoredAgent: BubbleStateSnapshot["active_agent"];
  timeoutMinutes: number;
  referenceTimestamp: string | null;
  deadlineTimestamp: string | null;
  remainingSeconds: number | null;
  expired: boolean;
}

const watchdogTrackedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export function computeWatchdogStatus(
  state: BubbleStateSnapshot,
  watchdogTimeoutMinutes: number,
  now: Date = new Date()
): WatchdogStatus {
  const trackedState = watchdogTrackedStates.has(state.state);
  const monitored = trackedState && state.active_agent !== null;
  const referenceTimestamp = state.last_command_at ?? state.active_since;

  if (!monitored || referenceTimestamp === null) {
    return {
      monitored,
      monitoredAgent: state.active_agent,
      timeoutMinutes: watchdogTimeoutMinutes,
      referenceTimestamp,
      deadlineTimestamp: null,
      remainingSeconds: null,
      expired: false
    };
  }

  const reference = new Date(referenceTimestamp);
  const referenceMs = reference.getTime();
  if (Number.isNaN(referenceMs)) {
    return {
      monitored,
      monitoredAgent: state.active_agent,
      timeoutMinutes: watchdogTimeoutMinutes,
      referenceTimestamp,
      deadlineTimestamp: null,
      remainingSeconds: null,
      expired: false
    };
  }

  const timeoutMs = watchdogTimeoutMinutes * 60_000;
  const deadlineMs = referenceMs + timeoutMs;
  const remainingMs = deadlineMs - now.getTime();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));

  return {
    monitored,
    monitoredAgent: state.active_agent,
    timeoutMinutes: watchdogTimeoutMinutes,
    referenceTimestamp,
    deadlineTimestamp: new Date(deadlineMs).toISOString(),
    remainingSeconds,
    expired: remainingMs <= 0
  };
}
