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
  isAgentRole,
  isBubbleExecutionContextAwaitedOutputType,
  type BubbleExecutionContext,
  type BubbleMetaReviewExecutionContext,
  type BubbleStateSnapshot
} from "../../types/bubble.js";
import {
  buildRunningExecutionContext,
  toMetaReviewExecutionContext
} from "../state/executionContext.js";

export const metaReviewExecutionContextPath = "meta_review.execution_context";
export const runningExecutionContextPath = "execution_context";

export function isMetaReviewExecutionContextActiveState(
  state: BubbleStateSnapshot
): boolean {
  if (state.state !== "RUNNING") {
    return false;
  }

  const executionContext = state.execution_context ?? null;
  return (
    executionContext !== null &&
    executionContext.active_role === "meta_reviewer" &&
    executionContext.awaited_output_type === "meta_review_result"
  );
}

export function buildMetaReviewExecutionContext(input: {
  bubbleId: string;
  round: number;
  startedAt: string;
  watchdogTimeoutMinutes: number;
  attempt: number;
}): BubbleMetaReviewExecutionContext {
  let executionContext: BubbleExecutionContext;
  try {
    executionContext = buildRunningExecutionContext({
      bubbleId: input.bubbleId,
      round: input.round,
      activeRole: "meta_reviewer",
      startedAt: input.startedAt,
      watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
      attempt: input.attempt
    });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new RangeError(
        error.message.replace(
          "running execution context",
          "meta-review execution context"
        )
      );
    }
    throw error;
  }
  const metaReviewExecutionContext = toMetaReviewExecutionContext(executionContext);
  if (metaReviewExecutionContext === null) {
    throw new Error("Failed to build meta-review execution context.");
  }
  return metaReviewExecutionContext;
}

export function validateActiveMetaReviewExecutionContext(
  state: BubbleStateSnapshot
): ValidationResult<BubbleExecutionContext> {
  const errors: ValidationError[] = [];

  if (state.state !== "RUNNING") {
    return validationFail([
      {
        path: "state",
        message: `Expected RUNNING state with active meta-review authority, received ${state.state}.`
      }
    ]);
  }

  const executionContext = state.execution_context ?? null;
  if (executionContext === null) {
    return validationFail([
      {
        path: runningExecutionContextPath,
        message:
          "RUNNING meta-review state requires canonical execution_context authority."
      }
    ]);
  }

  if (!isAgentRole(executionContext.active_role)) {
    errors.push({
      path: `${runningExecutionContextPath}.active_role`,
      message: "Must be one of: implementer, reviewer, meta_reviewer"
    });
  } else if (executionContext.active_role !== "meta_reviewer") {
    errors.push({
      path: `${runningExecutionContextPath}.active_role`,
      message: "Must be meta_reviewer while meta-review authority is active"
    });
  }

  if (!isNonEmptyString(executionContext.handoff_id)) {
    errors.push({
      path: `${runningExecutionContextPath}.handoff_id`,
      message: "Must be a non-empty string"
    });
  }

  if (!isInteger(executionContext.round) || executionContext.round < 1) {
    errors.push({
      path: `${runningExecutionContextPath}.round`,
      message: "Must be a positive integer"
    });
  } else if (executionContext.round !== state.round) {
    errors.push({
      path: `${runningExecutionContextPath}.round`,
      message: `Must match state.round (${state.round}) while meta-review authority is active`
    });
  }

  if (!isBubbleExecutionContextAwaitedOutputType(executionContext.awaited_output_type)) {
    errors.push({
      path: `${runningExecutionContextPath}.awaited_output_type`,
      message: "Must be meta_review_result"
    });
  } else if (executionContext.awaited_output_type !== "meta_review_result") {
    errors.push({
      path: `${runningExecutionContextPath}.awaited_output_type`,
      message: "Must be meta_review_result"
    });
  }

  const startedAtValid = isIsoTimestamp(executionContext.started_at);
  if (!startedAtValid) {
    errors.push({
      path: `${runningExecutionContextPath}.started_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const deadlineAtValid = isIsoTimestamp(executionContext.deadline_at);
  if (!deadlineAtValid) {
    errors.push({
      path: `${runningExecutionContextPath}.deadline_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (!isInteger(executionContext.attempt) || executionContext.attempt < 1) {
    errors.push({
      path: `${runningExecutionContextPath}.attempt`,
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
      path: `${runningExecutionContextPath}.deadline_at`,
      message: "Must be >= started_at"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk(executionContext);
}
