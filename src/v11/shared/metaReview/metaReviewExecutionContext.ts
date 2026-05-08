import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../validation/primitives.js";import {
  isAgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  BubbleExecutionContext,
  BubbleMetaReviewExecutionContext,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  isBubbleExecutionContextAwaitedOutputType
} from "../../../types/bubble.js";
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
    throw new Error(
      `META_REVIEW_EXECUTION_CONTEXT_BUILD_FAILED: context bubble_id=${input.bubbleId}; round=${input.round}; attempt=${input.attempt}`
    );
  }
  return metaReviewExecutionContext;
}

function validateMetaReviewExecutionIdentity(input: {
  state: BubbleStateSnapshot;
  executionContext: BubbleExecutionContext;
  errors: ValidationError[];
}): void {
  if (!isAgentRole(input.executionContext.active_role)) {
    input.errors.push({
      path: `${runningExecutionContextPath}.active_role`,
      message: "Must be one of: implementer, reviewer, meta_reviewer"
    });
  } else if (input.executionContext.active_role !== "meta_reviewer") {
    input.errors.push({
      path: `${runningExecutionContextPath}.active_role`,
      message: "Must be meta_reviewer while meta-review authority is active"
    });
  }

  if (!isNonEmptyString(input.executionContext.handoff_id)) {
    input.errors.push({
      path: `${runningExecutionContextPath}.handoff_id`,
      message: "Must be a non-empty string"
    });
  }

  if (!Object.hasOwn(input.executionContext, "execution_id")) {
    input.errors.push({
      path: `${runningExecutionContextPath}.execution_id`,
      message:
        "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: pre-E1 execution_context snapshots without execution_id are unsupported"
    });
  } else if (!isNonEmptyString(input.executionContext.execution_id)) {
    input.errors.push({
      path: `${runningExecutionContextPath}.execution_id`,
      message:
        "ACTOR_EMIT_CONTEXT_EXECUTION_ID_MISSING: Must be a non-empty string"
    });
  }

  if (!isInteger(input.executionContext.round) || input.executionContext.round < 1) {
    input.errors.push({
      path: `${runningExecutionContextPath}.round`,
      message: "Must be a positive integer"
    });
  } else if (input.executionContext.round !== input.state.round) {
    input.errors.push({
      path: `${runningExecutionContextPath}.round`,
      message: `Must match state.round (${input.state.round}) while meta-review authority is active`
    });
  }

  if (!isBubbleExecutionContextAwaitedOutputType(input.executionContext.awaited_output_type)) {
    input.errors.push({
      path: `${runningExecutionContextPath}.awaited_output_type`,
      message: "Must be meta_review_result"
    });
  } else if (input.executionContext.awaited_output_type !== "meta_review_result") {
    input.errors.push({
      path: `${runningExecutionContextPath}.awaited_output_type`,
      message: "Must be meta_review_result"
    });
  }
}

function validateMetaReviewExecutionTiming(input: {
  executionContext: BubbleExecutionContext;
  errors: ValidationError[];
}): void {
  const startedAtValid = isIsoTimestamp(input.executionContext.started_at);
  if (!startedAtValid) {
    input.errors.push({
      path: `${runningExecutionContextPath}.started_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const deadlineAtValid = isIsoTimestamp(input.executionContext.deadline_at);
  if (!deadlineAtValid) {
    input.errors.push({
      path: `${runningExecutionContextPath}.deadline_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (!isInteger(input.executionContext.attempt) || input.executionContext.attempt < 1) {
    input.errors.push({
      path: `${runningExecutionContextPath}.attempt`,
      message: "Must be an integer >= 1"
    });
  }

  const startedAtMs = Date.parse(input.executionContext.started_at);
  const deadlineAtMs = Date.parse(input.executionContext.deadline_at);
  if (startedAtValid && deadlineAtValid && deadlineAtMs < startedAtMs) {
    input.errors.push({
      path: `${runningExecutionContextPath}.deadline_at`,
      message: "Must be >= started_at"
    });
  }
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

  validateMetaReviewExecutionIdentity({
    state,
    executionContext,
    errors
  });
  validateMetaReviewExecutionTiming({
    executionContext,
    errors
  });

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk(executionContext);
}
