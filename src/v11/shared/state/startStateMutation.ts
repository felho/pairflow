import { applyStateTransition } from "../../domain/state/machine.js";
import {
  buildRestartedExecutionContext,
  buildRunningExecutionContext
} from "./executionContext.js";
import type {
  AgentName,
  BubbleLifecycleState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";

export interface StartLoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface StartWriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
  lockTimeoutMs?: number;
}

export type StartWriteStateSnapshotPort = (
  statePath: string,
  state: BubbleStateSnapshot,
  options?: StartWriteStateSnapshotOptions
) => Promise<StartLoadedStateSnapshot>;

export interface StartPreparingMutationInput {
  statePath: string;
  loadedState: StartLoadedStateSnapshot;
  nowIso: string;
  writeStateSnapshot: StartWriteStateSnapshotPort;
}

export interface StartRunningMutationInput {
  statePath: string;
  preparingState: BubbleStateSnapshot;
  preparingFingerprint: string;
  nowIso: string;
  bubbleId: string;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  ideationPending: boolean;
  writeStateSnapshot: StartWriteStateSnapshotPort;
}

export interface StartResumeMutationInput {
  statePath: string;
  loadedState: StartLoadedStateSnapshot;
  nowIso: string;
  watchdogTimeoutMinutes: number;
  writeStateSnapshot: StartWriteStateSnapshotPort;
}

export interface StartFailedMutationInput {
  statePath: string;
  preparingState: BubbleStateSnapshot;
  nowIso: string;
  writeStateSnapshot: StartWriteStateSnapshotPort;
}

export function buildResumedState(input: {
  state: BubbleStateSnapshot;
  nowIso: string;
  watchdogTimeoutMinutes: number;
}): BubbleStateSnapshot {
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
            restartedAt: input.nowIso,
            watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
            previousExecutionContext: executionContext
          })
        : executionContext;
    return {
      ...input.state,
      execution_context: resumedExecutionContext,
      active_since: input.nowIso,
      last_command_at: input.nowIso
    };
  }

  return {
    ...input.state,
    last_command_at: input.nowIso
  };
}

export async function executeStartPreparingMutation(
  input: StartPreparingMutationInput
): Promise<StartLoadedStateSnapshot> {
  const preparing = applyStateTransition(input.loadedState.state, {
    to: "PREPARING_WORKSPACE",
    lastCommandAt: input.nowIso
  });

  return input.writeStateSnapshot(input.statePath, preparing, {
    expectedFingerprint: input.loadedState.fingerprint,
    expectedState: "CREATED"
  });
}

export async function executeStartRunningMutation(
  input: StartRunningMutationInput
): Promise<StartLoadedStateSnapshot> {
  const running = applyStateTransition(input.preparingState, {
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
            startedAt: input.nowIso,
            watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
          }),
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso,
    ...(input.ideationPending
      ? {}
      : {
          appendRoundRoleEntry: {
            round: 1,
            implementer: input.implementer,
            reviewer: input.reviewer,
            switched_at: input.nowIso
          }
        })
  });

  return input.writeStateSnapshot(input.statePath, running, {
    expectedFingerprint: input.preparingFingerprint,
    expectedState: "PREPARING_WORKSPACE"
  });
}

export async function executeStartResumeMutation(
  input: StartResumeMutationInput
): Promise<StartLoadedStateSnapshot> {
  const resumed = buildResumedState({
    state: input.loadedState.state,
    nowIso: input.nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
  });

  return input.writeStateSnapshot(input.statePath, resumed, {
    expectedFingerprint: input.loadedState.fingerprint,
    expectedState: input.loadedState.state.state
  });
}

export async function executeStartFailedCleanupMutation(
  input: StartFailedMutationInput
): Promise<StartLoadedStateSnapshot> {
  const failed = applyStateTransition(input.preparingState, {
    to: "FAILED",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });

  return input.writeStateSnapshot(input.statePath, failed, {
    expectedState: "PREPARING_WORKSPACE"
  });
}
