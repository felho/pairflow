import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../validation.js";
import {
  isMetaReviewExecutionContextAwaitedOutputType,
  type BubbleMetaReviewExecutionContext,
  type BubbleStateSnapshot
} from "../../types/bubble.js";

export const metaReviewExecutionContextPath = "meta_review.execution_context";

export function buildMetaReviewExecutionContext(input: {
  bubbleId: string;
  round: number;
  startedAt: string;
  watchdogTimeoutMinutes: number;
  attempt: number;
}): BubbleMetaReviewExecutionContext {
  const startedAtMs = Date.parse(input.startedAt);
  if (Number.isNaN(startedAtMs)) {
    throw new RangeError(
      `meta-review execution context requires a valid startedAt timestamp: ${input.startedAt}`
    );
  }

  const watchdogTimeoutMs = input.watchdogTimeoutMinutes * 60_000;
  if (!Number.isFinite(watchdogTimeoutMs)) {
    throw new RangeError(
      `meta-review execution context requires a finite watchdog timeout: ${String(input.watchdogTimeoutMinutes)}`
    );
  }

  const deadlineAt = new Date(
    startedAtMs + watchdogTimeoutMs
  ).toISOString();

  return {
    handoff_id:
      `meta_review:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`,
    round: input.round,
    awaited_output_type: "meta_review_result",
    started_at: input.startedAt,
    deadline_at: deadlineAt,
    attempt: input.attempt
  };
}

export function validateActiveMetaReviewExecutionContext(
  state: BubbleStateSnapshot
): ValidationResult<BubbleMetaReviewExecutionContext> {
  const errors: ValidationError[] = [];

  if (state.state !== "META_REVIEW_RUNNING") {
    return validationFail([
      {
        path: "state",
        message: `Expected META_REVIEW_RUNNING state, received ${state.state}.`
      }
    ]);
  }

  const executionContext = state.meta_review?.execution_context;
  if (executionContext === undefined || executionContext === null) {
    return validationFail([
      {
        path: metaReviewExecutionContextPath,
        message:
          "META_REVIEW_RUNNING state requires canonical meta_review.execution_context authority."
      }
    ]);
  }

  if (!isNonEmptyString(executionContext.handoff_id)) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.handoff_id`,
      message: "Must be a non-empty string"
    });
  }

  if (!isInteger(executionContext.round) || executionContext.round < 1) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.round`,
      message: "Must be a positive integer"
    });
  } else if (executionContext.round !== state.round) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.round`,
      message: `Must match state.round (${state.round}) while META_REVIEW_RUNNING is active`
    });
  }

  if (
    !isMetaReviewExecutionContextAwaitedOutputType(
      executionContext.awaited_output_type
    )
  ) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.awaited_output_type`,
      message: "Must be meta_review_result"
    });
  }

  const startedAtValid = isIsoTimestamp(executionContext.started_at);
  if (!startedAtValid) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.started_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const deadlineAtValid = isIsoTimestamp(executionContext.deadline_at);
  if (!deadlineAtValid) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.deadline_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (!isInteger(executionContext.attempt) || executionContext.attempt < 1) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.attempt`,
      message: "Must be an integer >= 1"
    });
  }

  const startedAtMs = Date.parse(executionContext.started_at);
  const deadlineAtMs = Date.parse(executionContext.deadline_at);
  if (
    startedAtValid &&
    deadlineAtValid &&
    deadlineAtMs < startedAtMs
  ) {
    errors.push({
      path: `${metaReviewExecutionContextPath}.deadline_at`,
      message: "Must be >= started_at"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk(executionContext);
}
