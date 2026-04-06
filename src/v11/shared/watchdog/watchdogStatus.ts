import type { BubbleLifecycleState, BubbleStateSnapshot } from "../../../types/bubble.js";
import { SchemaValidationError } from "../validation/primitives.js";
import { metaReviewExecutionContextToRunningContext } from "../state/executionContext.js";
import { validateActiveMetaReviewExecutionContext } from "../metaReview/metaReviewExecutionContext.js";

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
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

const watchdogNonAgentMonitoredStates = new Set<BubbleLifecycleState>([
  "READY_FOR_HUMAN_APPROVAL"
]);

export function computeWatchdogStatus(
  state: BubbleStateSnapshot,
  watchdogTimeoutMinutes: number,
  now: Date = new Date()
): WatchdogStatus {
  const ideationRoundPending = state.state === "RUNNING" && state.round === 0;
  const trackedState = watchdogTrackedStates.has(state.state);
  const recoveredExecutionContext = metaReviewExecutionContextToRunningContext(
    state.meta_review?.execution_context
  );
  const watchdogValidationState =
    state.execution_context == null &&
    recoveredExecutionContext !== null
      ? {
          ...state,
          execution_context: recoveredExecutionContext
        }
      : state;
  const metaReviewExecutionContextResult =
    validateActiveMetaReviewExecutionContext(watchdogValidationState);
  const metaReviewAuthorityMonitored = metaReviewExecutionContextResult.ok;
  const monitored =
    !ideationRoundPending &&
    trackedState &&
    !watchdogNonAgentMonitoredStates.has(state.state) &&
    (
      state.active_agent !== null ||
      metaReviewAuthorityMonitored
    );
  let referenceTimestamp =
    watchdogValidationState.execution_context?.started_at ??
    state.last_command_at ??
    state.active_since;
  let deadlineTimestamp: string | null =
    watchdogValidationState.execution_context?.deadline_at ?? null;
  if (
    state.execution_context == null &&
    metaReviewExecutionContextResult.ok
  ) {
    referenceTimestamp = metaReviewExecutionContextResult.value.started_at;
    deadlineTimestamp = metaReviewExecutionContextResult.value.deadline_at;
  } else if (
    state.active_role === "meta_reviewer" &&
    state.execution_context == null &&
    !metaReviewExecutionContextResult.ok
  ) {
    throw new SchemaValidationError(
      "Invalid meta-review execution context",
      metaReviewExecutionContextResult.errors
    );
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
