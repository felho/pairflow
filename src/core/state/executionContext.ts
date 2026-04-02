import type {
  AgentRole,
  BubbleExecutionContext,
  BubbleExecutionContextAwaitedOutputType,
  BubbleMetaReviewExecutionContext
} from "../../types/bubble.js";

export function resolveAwaitedOutputTypeForRole(
  activeRole: AgentRole
): BubbleExecutionContextAwaitedOutputType {
  return activeRole === "meta_reviewer" ? "meta_review_result" : "pass_result";
}

function buildExecutionContextHandoffId(input: {
  bubbleId: string;
  activeRole: AgentRole;
  round: number;
  attempt: number;
}): string {
  if (input.activeRole === "meta_reviewer") {
    return `meta_review:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`;
  }

  return `${input.activeRole}:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`;
}

export function buildRunningExecutionContext(input: {
  bubbleId: string;
  round: number;
  activeRole: AgentRole;
  startedAt: string;
  watchdogTimeoutMinutes: number;
  attempt?: number;
}): BubbleExecutionContext {
  const startedAtMs = Date.parse(input.startedAt);
  if (Number.isNaN(startedAtMs)) {
    throw new RangeError(
      `running execution context requires a valid startedAt timestamp: ${input.startedAt}`
    );
  }

  const watchdogTimeoutMs = input.watchdogTimeoutMinutes * 60_000;
  if (
    !Number.isFinite(watchdogTimeoutMs)
    || input.watchdogTimeoutMinutes <= 0
  ) {
    throw new RangeError(
      `running execution context requires a positive finite watchdog timeout: ${String(input.watchdogTimeoutMinutes)}`
    );
  }
  if (!Number.isInteger(input.round) || input.round < 1) {
    throw new RangeError(
      `running execution context requires round >= 1: ${String(input.round)}`
    );
  }

  const attempt = input.attempt ?? 1;
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(
      `running execution context requires attempt >= 1: ${String(attempt)}`
    );
  }
  return {
    active_role: input.activeRole,
    awaited_output_type: resolveAwaitedOutputTypeForRole(input.activeRole),
    handoff_id: buildExecutionContextHandoffId({
      bubbleId: input.bubbleId,
      activeRole: input.activeRole,
      round: input.round,
      attempt
    }),
    round: input.round,
    started_at: input.startedAt,
    deadline_at: new Date(startedAtMs + watchdogTimeoutMs).toISOString(),
    attempt
  };
}

export function toMetaReviewExecutionContext(
  executionContext: BubbleExecutionContext | null | undefined
): BubbleMetaReviewExecutionContext | null {
  if (
    executionContext === null
    || executionContext === undefined
    || executionContext.active_role !== "meta_reviewer"
    || executionContext.awaited_output_type !== "meta_review_result"
  ) {
    return null;
  }

  return {
    handoff_id: executionContext.handoff_id,
    round: executionContext.round,
    awaited_output_type: executionContext.awaited_output_type,
    started_at: executionContext.started_at,
    deadline_at: executionContext.deadline_at,
    attempt: executionContext.attempt
  };
}

export function metaReviewExecutionContextToRunningContext(
  executionContext: BubbleMetaReviewExecutionContext | null | undefined
): BubbleExecutionContext | null {
  if (executionContext === null || executionContext === undefined) {
    return null;
  }

  return {
    active_role: "meta_reviewer",
    awaited_output_type: executionContext.awaited_output_type,
    handoff_id: executionContext.handoff_id,
    round: executionContext.round,
    started_at: executionContext.started_at,
    deadline_at: executionContext.deadline_at,
    attempt: executionContext.attempt
  };
}

export function executionContextsEqual(
  left: BubbleExecutionContext | null | undefined,
  right: BubbleExecutionContext | null | undefined
): boolean {
  if (left === right) {
    return true;
  }

  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return (
    left.active_role === right.active_role
    && left.awaited_output_type === right.awaited_output_type
    && left.handoff_id === right.handoff_id
    && left.round === right.round
    && left.started_at === right.started_at
    && left.deadline_at === right.deadline_at
    && left.attempt === right.attempt
  );
}
