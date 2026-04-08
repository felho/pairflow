import {
  isMetaReviewExecutionContextAwaitedOutputType,
  isMetaReviewRuntimeDeliveryStatus,
  type BubbleMetaReviewExecutionContext,
  type BubbleMetaReviewRuntimeDeliveryState
} from "../../../types/bubble.js";
import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";

function validateMetaReviewExecutionContextTimestamps(input: {
  pathPrefix: string;
  startedAt: unknown;
  deadlineAt: unknown;
  errors: ValidationError[];
}): { startedAt: string; deadlineAt: string } | null {
  const startedAtValid = isIsoTimestamp(input.startedAt);
  if (!startedAtValid) {
    input.errors.push({
      path: `${input.pathPrefix}.started_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const deadlineAtValid = isIsoTimestamp(input.deadlineAt);
  if (!deadlineAtValid) {
    input.errors.push({
      path: `${input.pathPrefix}.deadline_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (startedAtValid && deadlineAtValid) {
    const startedAtMs = Date.parse(String(input.startedAt));
    const deadlineAtMs = Date.parse(String(input.deadlineAt));
    if (deadlineAtMs < startedAtMs) {
      input.errors.push({
        path: `${input.pathPrefix}.deadline_at`,
        message: "Must be >= started_at"
      });
    }
  }

  if (!startedAtValid || !deadlineAtValid) {
    return null;
  }

  return {
    startedAt: input.startedAt as string,
    deadlineAt: input.deadlineAt as string
  };
}

export function validateMetaReviewExecutionContext(
  input: unknown,
  pathPrefix: string,
  errors: ValidationError[]
): BubbleMetaReviewExecutionContext | null {
  if (input === null) {
    return null;
  }

  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be null or an object"
    });
    return null;
  }

  const handoffId = input.handoff_id;
  if (!isNonEmptyString(handoffId)) {
    errors.push({
      path: `${pathPrefix}.handoff_id`,
      message: "Must be a non-empty string"
    });
  }

  const round = input.round;
  if (!isInteger(round) || round < 1) {
    errors.push({
      path: `${pathPrefix}.round`,
      message: "Must be a positive integer"
    });
  }

  const awaitedOutputType = input.awaited_output_type;
  if (!isMetaReviewExecutionContextAwaitedOutputType(awaitedOutputType)) {
    errors.push({
      path: `${pathPrefix}.awaited_output_type`,
      message: "Must be meta_review_result"
    });
  }

  const startedAt = input.started_at;
  const deadlineAt = input.deadline_at;
  const validatedTimestamps = validateMetaReviewExecutionContextTimestamps({
    pathPrefix,
    startedAt,
    deadlineAt,
    errors
  });

  const attempt = input.attempt;
  if (!isInteger(attempt) || attempt < 1) {
    errors.push({
      path: `${pathPrefix}.attempt`,
      message: "Must be an integer >= 1"
    });
  }

  if (
    !isNonEmptyString(handoffId) ||
    !isInteger(round) ||
    round < 1 ||
    !isMetaReviewExecutionContextAwaitedOutputType(awaitedOutputType) ||
    validatedTimestamps === null ||
    !isInteger(attempt) ||
    attempt < 1
  ) {
    return null;
  }

  return {
    handoff_id: handoffId,
    round,
    awaited_output_type: awaitedOutputType,
    started_at: validatedTimestamps.startedAt,
    deadline_at: validatedTimestamps.deadlineAt,
    attempt
  };
}

export function validateMetaReviewRuntimeDelivery(
  input: unknown,
  pathPrefix: string,
  errors: ValidationError[]
): BubbleMetaReviewRuntimeDeliveryState | null {
  if (input === null) {
    return null;
  }

  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be null or an object"
    });
    return null;
  }

  const status = input.status;
  if (!isMetaReviewRuntimeDeliveryStatus(status)) {
    errors.push({
      path: `${pathPrefix}.status`,
      message: "Must be one of: confirmed, uncertain, failed"
    });
  }

  const reasonCode = input.reason_code;
  if (!(reasonCode === null || isNonEmptyString(reasonCode))) {
    errors.push({
      path: `${pathPrefix}.reason_code`,
      message: "Must be null or a non-empty string"
    });
  }

  const message = input.message;
  if (!isNonEmptyString(message)) {
    errors.push({
      path: `${pathPrefix}.message`,
      message: "Must be a non-empty string"
    });
  }

  const observedAt = input.observed_at;
  const observedAtValid = isIsoTimestamp(observedAt);
  if (!observedAtValid) {
    errors.push({
      path: `${pathPrefix}.observed_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const observedTarget = validateObservedTargetFields(input, pathPrefix, errors);

  if (
    !isMetaReviewRuntimeDeliveryStatus(status) ||
    !isNonEmptyString(message) ||
    !observedAtValid
  ) {
    return null;
  }

  return {
    status,
    reason_code: isNonEmptyString(reasonCode) ? reasonCode : null,
    message,
    observed_at: observedAt,
    observed_for_handoff_id: observedTarget.observedForHandoffId,
    observed_for_round: observedTarget.observedForRound
  };
}

function validateObservedTargetFields(
  input: Record<string, unknown>,
  pathPrefix: string,
  errors: ValidationError[]
): {
  observedForHandoffId: string | null;
  observedForRound: number | null;
} {
  const observedForHandoffId = input.observed_for_handoff_id;
  if (
    !(
      observedForHandoffId === null ||
      observedForHandoffId === undefined ||
      isNonEmptyString(observedForHandoffId)
    )
  ) {
    errors.push({
      path: `${pathPrefix}.observed_for_handoff_id`,
      message: "Must be null or a non-empty string"
    });
  }

  const observedForRound = input.observed_for_round;
  if (
    !(
      observedForRound === null ||
      observedForRound === undefined ||
      (isInteger(observedForRound) && observedForRound >= 1)
    )
  ) {
    errors.push({
      path: `${pathPrefix}.observed_for_round`,
      message: "Must be null or a positive integer"
    });
  }

  return {
    observedForHandoffId:
      isNonEmptyString(observedForHandoffId) ? observedForHandoffId : null,
    observedForRound:
      isInteger(observedForRound) && observedForRound >= 1
        ? observedForRound
        : null
  };
}
