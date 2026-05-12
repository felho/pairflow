import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../domain/state/snapshot/projection.js";
import {
  buildRestartedExecutionContext,
  buildRunningExecutionContext
} from "../../domain/state/execution/executionContext.js";
import { assertParsedDomainBubbleStateSnapshot } from "./stateSchema.js";
import { applyStateTransition } from "./machine.js";

export interface DeriveStartPreparingStateInput {
  state: BubbleStateSnapshot;
  lastCommandAt: string;
}

export interface DeriveStartRunningStateInput {
  preparingState: BubbleStateSnapshot;
  lastCommandAt: string;
  bubbleId: string;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  ideationPending: boolean;
}

export interface DeriveStartResumedStateInput {
  state: BubbleStateSnapshot;
  lastCommandAt: string;
  watchdogTimeoutMinutes: number;
}

export interface DeriveStartFailedCleanupStateInput {
  preparingState: BubbleStateSnapshot;
  lastCommandAt: string;
}

export function deriveStartPreparingState(
  input: DeriveStartPreparingStateInput
): BubbleStateSnapshot {
  return applyStateTransition(input.state, {
    to: "PREPARING_WORKSPACE",
    lastCommandAt: input.lastCommandAt
  });
}

export function deriveStartRunningState(
  input: DeriveStartRunningStateInput
): BubbleStateSnapshot {
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
): BubbleStateSnapshot {
  const currentPersisted = toPersistedSnapshot(input.state);
  if (
    currentPersisted.state === "RUNNING"
    && currentPersisted.round >= 1
    && currentPersisted.active_role !== null
  ) {
    const executionContext = currentPersisted.execution_context;
    if (executionContext === null || executionContext === undefined) {
      throw new Error(
        "RUNNING resume requires persisted execution_context authority."
      );
    }
    const resumedExecutionContext =
      currentPersisted.active_role === "implementer"
      || currentPersisted.active_role === "reviewer"
        ? buildRestartedExecutionContext({
            bubbleId: currentPersisted.bubble_id,
            round: currentPersisted.round,
            activeRole: currentPersisted.active_role,
            restartedAt: input.lastCommandAt,
            watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
            previousExecutionContext: executionContext
          })
        : executionContext;
    return assertParsedDomainBubbleStateSnapshot({
      ...currentPersisted,
      execution_context: resumedExecutionContext,
      active_since: input.lastCommandAt,
      last_command_at: input.lastCommandAt
    });
  }

  return assertParsedDomainBubbleStateSnapshot({
    ...currentPersisted,
    last_command_at: input.lastCommandAt
  });
}

export function deriveStartFailedCleanupState(
  input: DeriveStartFailedCleanupStateInput
): BubbleStateSnapshot {
  return applyStateTransition(input.preparingState, {
    to: "FAILED",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.lastCommandAt
  });
}
