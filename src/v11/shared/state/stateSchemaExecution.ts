import {
  isBubbleExecutionContextAwaitedOutputType,
  type BubbleExecutionContext
} from "./executionContextTypes.js";
import {
  isAgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
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

function validateExecutionContextIdentityFields(input: {
  value: Record<string, unknown>;
  pathPrefix: string;
  errors: ValidationError[];
}): {
  activeRole: BubbleExecutionContext["active_role"] | null;
  handoffId: string | null;
  executionId: string | null;
  round: number | null;
  awaitedOutputType: BubbleExecutionContext["awaited_output_type"] | null;
} {
  const activeRoleRaw = input.value.active_role;
  const activeRole = isAgentRole(activeRoleRaw) ? activeRoleRaw : null;
  if (activeRole === null) {
    input.errors.push({
      path: `${input.pathPrefix}.active_role`,
      message: "Must be one of: implementer, reviewer, meta_reviewer"
    });
  }

  const handoffIdRaw = input.value.handoff_id;
  const handoffId = isNonEmptyString(handoffIdRaw) ? handoffIdRaw : null;
  if (handoffId === null) {
    input.errors.push({
      path: `${input.pathPrefix}.handoff_id`,
      message: "Must be a non-empty string"
    });
  }

  const hasExecutionId = Object.hasOwn(input.value, "execution_id");
  const executionIdRaw = input.value.execution_id;
  const executionId = isNonEmptyString(executionIdRaw) ? executionIdRaw : null;
  if (!hasExecutionId) {
    input.errors.push({
      path: `${input.pathPrefix}.execution_id`,
      message:
        "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: pre-E1 execution_context snapshots without execution_id are unsupported"
    });
  } else if (executionId === null) {
    input.errors.push({
      path: `${input.pathPrefix}.execution_id`,
      message:
        "ACTOR_EMIT_CONTEXT_EXECUTION_ID_MISSING: Must be a non-empty string"
    });
  }

  const roundRaw = input.value.round;
  const round =
    isInteger(roundRaw) && roundRaw >= 1
      ? roundRaw
      : null;
  if (round === null) {
    input.errors.push({
      path: `${input.pathPrefix}.round`,
      message: "Must be a positive integer"
    });
  }

  const awaitedOutputTypeRaw = input.value.awaited_output_type;
  const awaitedOutputType =
    isBubbleExecutionContextAwaitedOutputType(awaitedOutputTypeRaw)
      ? awaitedOutputTypeRaw
      : null;
  if (awaitedOutputType === null) {
    input.errors.push({
      path: `${input.pathPrefix}.awaited_output_type`,
      message: "Must be one of: pass_result, meta_review_result"
    });
  }

  return {
    activeRole,
    handoffId,
    executionId,
    round,
    awaitedOutputType
  };
}

function validateExecutionContextAttempt(input: {
  value: Record<string, unknown>;
  pathPrefix: string;
  errors: ValidationError[];
}): number | null {
  const attemptRaw = input.value.attempt;
  const attempt =
    isInteger(attemptRaw) && attemptRaw >= 1
      ? attemptRaw
      : null;
  if (attempt === null) {
    input.errors.push({
      path: `${input.pathPrefix}.attempt`,
      message: "Must be an integer >= 1"
    });
  }
  return attempt;
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

  const identity = validateExecutionContextIdentityFields({
    value: input,
    pathPrefix,
    errors
  });

  const startedAt = input.started_at;
  const deadlineAt = input.deadline_at;
  const validatedTimestamps = validateExecutionContextTimestamps({
    pathPrefix,
    startedAt,
    deadlineAt,
    errors
  });

  const attempt = validateExecutionContextAttempt({
    value: input,
    pathPrefix,
    errors
  });

  if (
    identity.activeRole === null ||
    identity.handoffId === null ||
    identity.executionId === null ||
    identity.round === null ||
    identity.awaitedOutputType === null ||
    validatedTimestamps === null ||
    attempt === null
  ) {
    return null;
  }

  return {
    active_role: identity.activeRole,
    handoff_id: identity.handoffId,
    execution_id: identity.executionId,
    round: identity.round,
    awaited_output_type: identity.awaitedOutputType,
    started_at: validatedTimestamps.startedAt,
    deadline_at: validatedTimestamps.deadlineAt,
    attempt
  };
}
