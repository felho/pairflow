import type { BubbleLifecycleState } from "../../../contracts/kernel/lifecycle.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import { metaReviewExecutionContextToRunningContext } from "../../domain/state/execution/executionContext.js";
import { resolveWatchdogStatusTiming } from "./watchdogStatusTiming.js";

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

function isWatchdogMonitoredState(input: {
  state: BubbleStateSnapshot;
  recoveredExecutionContext: ReturnType<typeof metaReviewExecutionContextToRunningContext>;
}): boolean {
  const ideationRoundPending =
    input.state.state === "RUNNING" && input.state.round === 0;
  const trackedState = watchdogTrackedStates.has(input.state.state);
  const excludesActiveAgent = watchdogNonAgentMonitoredStates.has(input.state.state);

  return (
    !ideationRoundPending &&
    trackedState &&
    !excludesActiveAgent &&
    (input.state.active_agent !== null || input.recoveredExecutionContext !== null)
  );
}

export function computeWatchdogStatus(
  state: BubbleStateSnapshot,
  watchdogTimeoutMinutes: number,
  now: Date = new Date()
): WatchdogStatus {
  const recoveredExecutionContext = metaReviewExecutionContextToRunningContext(
    state.meta_review?.execution_context
  );
  const monitored = isWatchdogMonitoredState({
    state,
    recoveredExecutionContext
  });
  const timing = resolveWatchdogStatusTiming({
    state,
    watchdogTimeoutMinutes,
    now,
    monitored
  });

  return {
    monitored,
    monitoredAgent: state.active_agent,
    timeoutMinutes: watchdogTimeoutMinutes,
    referenceTimestamp: timing.referenceTimestamp,
    deadlineTimestamp: timing.deadlineTimestamp,
    remainingSeconds: timing.remainingSeconds,
    expired: timing.expired
  };
}
