import {
  isAgentRole,
  isBubbleExecutionContextAwaitedOutputType,
  type BubbleExecutionContext
} from "../../../types/bubble.js";
import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";

function validateExecutionContextTimestamps(input: {
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

export function validateExecutionContext(
  input: unknown,
  pathPrefix: string,
  errors: ValidationError[]
): BubbleExecutionContext | null {
  if (input === undefined || input === null) {
    return null;
  }

  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be null or an object"
    });
    return null;
  }

  const activeRole = input.active_role;
  if (!isAgentRole(activeRole)) {
    errors.push({
      path: `${pathPrefix}.active_role`,
      message: "Must be one of: implementer, reviewer, meta_reviewer"
    });
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
  if (!isBubbleExecutionContextAwaitedOutputType(awaitedOutputType)) {
    errors.push({
      path: `${pathPrefix}.awaited_output_type`,
      message: "Must be one of: pass_result, meta_review_result"
    });
  }

  const startedAt = input.started_at;
  const deadlineAt = input.deadline_at;
  const validatedTimestamps = validateExecutionContextTimestamps({
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
    !isAgentRole(activeRole) ||
    !isNonEmptyString(handoffId) ||
    !isInteger(round) ||
    round < 1 ||
    !isBubbleExecutionContextAwaitedOutputType(awaitedOutputType) ||
    validatedTimestamps === null ||
    !isInteger(attempt) ||
    attempt < 1
  ) {
    return null;
  }

  return {
    active_role: activeRole,
    handoff_id: handoffId,
    round,
    awaited_output_type: awaitedOutputType,
    started_at: validatedTimestamps.startedAt,
    deadline_at: validatedTimestamps.deadlineAt,
    attempt
  };
}
