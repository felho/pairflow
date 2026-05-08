import { createHash } from "node:crypto";
import type {
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  BubbleExecutionContext,
  BubbleMetaReviewExecutionContext
} from "./executionContextTypes.js";
import {
  buildExecutionContextHandoffIdForRole,
  getRoleExecutionProjectionDescriptor
} from "../actorProtocol/roleExecutionProjection.js";

export interface RunningExecutionContextInput {
  bubbleId: string;
  round: number;
  activeRole: AgentRole;
  startedAt: string;
  watchdogTimeoutMinutes: number;
  attempt?: number;
}

export interface RestartedExecutionContextInput {
  bubbleId: string;
  round: number;
  activeRole: AgentRole;
  restartedAt: string;
  watchdogTimeoutMinutes: number;
  previousExecutionContext: BubbleExecutionContext;
}

function buildExecutionContextId(input: {
  bubbleId: string;
  activeRole: AgentRole;
  awaitedOutputType: BubbleExecutionContext["awaited_output_type"];
  round: number;
  attempt: number;
  startedAt: string;
  deadlineAt: string;
}): string {
  const payload = JSON.stringify({
    bubbleId: input.bubbleId,
    activeRole: input.activeRole,
    awaitedOutputType: input.awaitedOutputType,
    round: input.round,
    attempt: input.attempt,
    startedAt: input.startedAt,
    deadlineAt: input.deadlineAt
  });
  return `exec_${createHash("sha256").update(payload).digest("hex").slice(0, 24)}`;
}

export function buildRunningExecutionContext(
  input: RunningExecutionContextInput
): BubbleExecutionContext {
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
  const awaitedOutputType =
    getRoleExecutionProjectionDescriptor(input.activeRole).primary_awaited_output_type;
  const deadlineAt = new Date(startedAtMs + watchdogTimeoutMs).toISOString();
  return {
    active_role: input.activeRole,
    awaited_output_type: awaitedOutputType,
    handoff_id: buildExecutionContextHandoffIdForRole({
      bubbleId: input.bubbleId,
      activeRole: input.activeRole,
      round: input.round,
      attempt
    }),
    execution_id: buildExecutionContextId({
      bubbleId: input.bubbleId,
      activeRole: input.activeRole,
      awaitedOutputType,
      round: input.round,
      attempt,
      startedAt: input.startedAt,
      deadlineAt
    }),
    round: input.round,
    started_at: input.startedAt,
    deadline_at: deadlineAt,
    attempt
  };
}

export function buildRestartedExecutionContext(
  input: RestartedExecutionContextInput
): BubbleExecutionContext {
  const awaitedOutputType =
    getRoleExecutionProjectionDescriptor(input.activeRole).primary_awaited_output_type;
  if (input.previousExecutionContext.active_role !== input.activeRole) {
    throw new RangeError(
      `restarted execution context requires matching active role: ${input.previousExecutionContext.active_role} !== ${input.activeRole}`
    );
  }
  if (input.previousExecutionContext.round !== input.round) {
    throw new RangeError(
      `restarted execution context requires matching round: ${String(input.previousExecutionContext.round)} !== ${String(input.round)}`
    );
  }
  if (input.previousExecutionContext.awaited_output_type !== awaitedOutputType) {
    throw new RangeError(
      `restarted execution context requires matching awaited output type: ${input.previousExecutionContext.awaited_output_type} !== ${awaitedOutputType}`
    );
  }

  return buildRunningExecutionContext({
    bubbleId: input.bubbleId,
    round: input.round,
    activeRole: input.activeRole,
    startedAt: input.restartedAt,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
    attempt: input.previousExecutionContext.attempt + 1
  });
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
    execution_id: executionContext.execution_id,
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
    execution_id: executionContext.execution_id,
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
    && left.execution_id === right.execution_id
    && left.round === right.round
    && left.started_at === right.started_at
    && left.deadline_at === right.deadline_at
    && left.attempt === right.attempt
  );
}
