import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import {
  buildRestartedExecutionContext,
  buildRunningExecutionContext
} from "../../domain/state/execution/executionContext.js";
import { applyStateTransition } from "./machine.js";

export interface DeriveStartPreparingStateInput {
  state: PersistedBubbleStateSnapshot;
  lastCommandAt: string;
}

export interface DeriveStartRunningStateInput {
  preparingState: PersistedBubbleStateSnapshot;
  lastCommandAt: string;
  bubbleId: string;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  ideationPending: boolean;
}

export interface DeriveStartResumedStateInput {
  state: PersistedBubbleStateSnapshot;
  lastCommandAt: string;
  watchdogTimeoutMinutes: number;
}

export interface DeriveStartFailedCleanupStateInput {
  preparingState: PersistedBubbleStateSnapshot;
  lastCommandAt: string;
}

export function deriveStartPreparingState(
  input: DeriveStartPreparingStateInput
): PersistedBubbleStateSnapshot {
  return applyStateTransition(input.state, {
    to: "PREPARING_WORKSPACE",
    lastCommandAt: input.lastCommandAt
  });
}

export function deriveStartRunningState(
  input: DeriveStartRunningStateInput
): PersistedBubbleStateSnapshot {
  return applyStateTransition(input.preparingState, {
    to: "RUNNING",
    round: input.ideationPending ? 0 : 1,
    activeAgent: input.implementer,
    activeRole: "implementer",
    executionContext:
      input.ideationPending
        ? null
        : buildRunningExecutionContext({
            bubbleId: input.bubbleId,
            round: 1,
            activeRole: "implementer",
            startedAt: input.lastCommandAt,
            watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
          }),
    activeSince: input.lastCommandAt,
    lastCommandAt: input.lastCommandAt,
    ...(input.ideationPending
      ? {}
      : {
          appendRoundRoleEntry: {
            round: 1,
            implementer: input.implementer,
            reviewer: input.reviewer,
            switched_at: input.lastCommandAt
          }
        })
  });
}

export function deriveStartResumedState(
  input: DeriveStartResumedStateInput
): PersistedBubbleStateSnapshot {
  if (
    input.state.state === "RUNNING"
    && input.state.round >= 1
    && input.state.active_role !== null
  ) {
    const executionContext = input.state.execution_context;
    if (executionContext === null || executionContext === undefined) {
      throw new Error(
        "RUNNING resume requires persisted execution_context authority."
      );
    }
    const resumedExecutionContext =
      input.state.active_role === "implementer"
      || input.state.active_role === "reviewer"
        ? buildRestartedExecutionContext({
            bubbleId: input.state.bubble_id,
            round: input.state.round,
            activeRole: input.state.active_role,
            restartedAt: input.lastCommandAt,
            watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
            previousExecutionContext: executionContext
          })
        : executionContext;
    return {
      ...input.state,
      execution_context: resumedExecutionContext,
      active_since: input.lastCommandAt,
      last_command_at: input.lastCommandAt
    };
  }

  return {
    ...input.state,
    last_command_at: input.lastCommandAt
  };
}

export function deriveStartFailedCleanupState(
  input: DeriveStartFailedCleanupStateInput
): PersistedBubbleStateSnapshot {
  return applyStateTransition(input.preparingState, {
    to: "FAILED",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.lastCommandAt
  });
}
