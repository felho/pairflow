import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import { SchemaValidationError } from "../validation/primitives.js";
import { metaReviewExecutionContextToRunningContext } from "../../domain/state/execution/executionContext.js";
import { validateActiveMetaReviewExecutionContext } from "../metaReview/metaReviewExecutionContext.js";

interface WatchdogStatusTimingInput {
  state: BubbleStateSnapshot;
  watchdogTimeoutMinutes: number;
  now: Date;
  monitored: boolean;
}

interface WatchdogStatusTimingResult {
  referenceTimestamp: string | null;
  deadlineTimestamp: string | null;
  remainingSeconds: number | null;
  expired: boolean;
}

function buildEmptyWatchdogStatusTiming(
  referenceTimestamp: string | null,
  deadlineTimestamp: string | null
): WatchdogStatusTimingResult {
  return {
    referenceTimestamp,
    deadlineTimestamp,
    remainingSeconds: null,
    expired: false
  };
}

function buildInvalidReferenceWatchdogStatusTiming(
  referenceTimestamp: string
): WatchdogStatusTimingResult {
  return buildEmptyWatchdogStatusTiming(referenceTimestamp, null);
}

function buildInvalidDeadlineWatchdogStatusTiming(
  referenceTimestamp: string,
  deadlineTimestamp: string | null
): WatchdogStatusTimingResult {
  return buildEmptyWatchdogStatusTiming(referenceTimestamp, deadlineTimestamp);
}

export function resolveWatchdogStatusTiming(
  input: WatchdogStatusTimingInput
): WatchdogStatusTimingResult {
  const recoveredExecutionContext = metaReviewExecutionContextToRunningContext(
    input.state.meta_review?.execution_context
  );
  const watchdogValidationState =
    input.state.execution_context == null &&
    recoveredExecutionContext !== null
      ? {
          ...input.state,
          execution_context: recoveredExecutionContext
        }
      : input.state;
  const metaReviewExecutionContextResult =
    validateActiveMetaReviewExecutionContext(watchdogValidationState);

  let referenceTimestamp =
    watchdogValidationState.execution_context?.started_at ??
    input.state.last_command_at ??
    input.state.active_since;
  let deadlineTimestamp: string | null =
    watchdogValidationState.execution_context?.deadline_at ?? null;
  if (
    input.state.execution_context == null &&
    metaReviewExecutionContextResult.ok
  ) {
    referenceTimestamp = metaReviewExecutionContextResult.value.started_at;
    deadlineTimestamp = metaReviewExecutionContextResult.value.deadline_at;
  } else if (
    input.state.state === "RUNNING" &&
    input.state.active_role === "meta_reviewer" &&
    input.state.execution_context == null &&
    !metaReviewExecutionContextResult.ok
  ) {
    throw new SchemaValidationError(
      "Invalid meta-review execution context",
      metaReviewExecutionContextResult.errors
    );
  }

  if (!input.monitored || referenceTimestamp === null) {
    return buildEmptyWatchdogStatusTiming(referenceTimestamp, deadlineTimestamp);
  }

  const reference = new Date(referenceTimestamp);
  const referenceMs = reference.getTime();
  if (Number.isNaN(referenceMs)) {
    return buildInvalidReferenceWatchdogStatusTiming(referenceTimestamp);
  }

  const resolvedDeadlineTimestamp =
    deadlineTimestamp === null
      ? new Date(
          referenceMs + input.watchdogTimeoutMinutes * 60_000
        ).toISOString()
      : deadlineTimestamp;
  const deadlineMs = Date.parse(resolvedDeadlineTimestamp);
  if (Number.isNaN(deadlineMs)) {
    return buildInvalidDeadlineWatchdogStatusTiming(
      referenceTimestamp,
      deadlineTimestamp
    );
  }

  const remainingMs = deadlineMs - input.now.getTime();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));

  return {
    referenceTimestamp,
    deadlineTimestamp: resolvedDeadlineTimestamp,
    remainingSeconds,
    expired: remainingMs <= 0
  };
}
