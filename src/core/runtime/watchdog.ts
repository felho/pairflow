import type { BubbleLifecycleState, BubbleStateSnapshot } from "../../types/bubble.js";
import { SchemaValidationError } from "../validation.js";
import { validateActiveMetaReviewExecutionContext } from "../bubble/metaReviewExecutionContext.js";

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
  "META_REVIEW_RUNNING",
  "META_REVIEW_FAILED",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

const watchdogNonAgentMonitoredStates = new Set<BubbleLifecycleState>([
  "META_REVIEW_FAILED",
  "READY_FOR_HUMAN_APPROVAL"
]);
const watchdogAgentOptionalStates = new Set<BubbleLifecycleState>([
  "META_REVIEW_RUNNING"
]);

export function computeWatchdogStatus(
  state: BubbleStateSnapshot,
  watchdogTimeoutMinutes: number,
  now: Date = new Date()
): WatchdogStatus {
  const ideationRoundPending = state.state === "RUNNING" && state.round === 0;
  const trackedState = watchdogTrackedStates.has(state.state);
  const requiresActiveAgent = !watchdogAgentOptionalStates.has(state.state);
  const monitored =
    !ideationRoundPending &&
    trackedState &&
    !watchdogNonAgentMonitoredStates.has(state.state) &&
    (!requiresActiveAgent || state.active_agent !== null);
  let referenceTimestamp = state.last_command_at ?? state.active_since;
  let deadlineTimestamp: string | null = null;

  if (state.state === "META_REVIEW_RUNNING") {
    const executionContextResult = validateActiveMetaReviewExecutionContext(state);
    if (!executionContextResult.ok) {
      throw new SchemaValidationError(
        "Invalid META_REVIEW_RUNNING execution context",
        executionContextResult.errors
      );
    }
    referenceTimestamp = executionContextResult.value.started_at;
    deadlineTimestamp = executionContextResult.value.deadline_at;
  }

  if (!monitored || referenceTimestamp === null) {
    return {
      monitored,
      monitoredAgent: state.active_agent,
      timeoutMinutes: watchdogTimeoutMinutes,
      referenceTimestamp,
      deadlineTimestamp,
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

  const deadlineMs =
    deadlineTimestamp === null
      ? referenceMs + watchdogTimeoutMinutes * 60_000
      : Date.parse(deadlineTimestamp);
  if (Number.isNaN(deadlineMs)) {
    return {
      monitored,
      monitoredAgent: state.active_agent,
      timeoutMinutes: watchdogTimeoutMinutes,
      referenceTimestamp,
      deadlineTimestamp,
      remainingSeconds: null,
      expired: false
    };
  }
  const remainingMs = deadlineMs - now.getTime();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));

  return {
    monitored,
    monitoredAgent: state.active_agent,
    timeoutMinutes: watchdogTimeoutMinutes,
    referenceTimestamp,
    deadlineTimestamp:
      deadlineTimestamp ?? new Date(deadlineMs).toISOString(),
    remainingSeconds,
    expired: remainingMs <= 0
  };
}
