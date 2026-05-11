import {
  deriveStartFailedCleanupState,
  deriveStartPreparingState,
  deriveStartResumedState,
  deriveStartRunningState
} from "../../../../domain/state/startState.js";
import { persistStateViaMutationBoundary } from "../../../../shared/mutation/mutationBoundaryIO.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleLifecycleState } from "../../../../../contracts/kernel/lifecycle.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";

export interface StartLoadedStateSnapshot {
  state: PersistedBubbleStateSnapshot;
  fingerprint: string;
}

export interface StartWriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
  lockTimeoutMs?: number;
}

export type StartWriteStateSnapshotPort = (
  statePath: string,
  state: PersistedBubbleStateSnapshot,
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
  preparingState: PersistedBubbleStateSnapshot;
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
  preparingState: PersistedBubbleStateSnapshot;
  nowIso: string;
  writeStateSnapshot: StartWriteStateSnapshotPort;
}

export function buildResumedState(input: {
  state: PersistedBubbleStateSnapshot;
  nowIso: string;
  watchdogTimeoutMinutes: number;
}): PersistedBubbleStateSnapshot {
  return deriveStartResumedState({
    state: input.state,
    lastCommandAt: input.nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
  });
}

export async function executeStartPreparingMutation(
  input: StartPreparingMutationInput
): Promise<StartLoadedStateSnapshot> {
  const preparing = deriveStartPreparingState({
    state: input.loadedState.state,
    lastCommandAt: input.nowIso
  });

  return persistStateViaMutationBoundary({
    write: input.writeStateSnapshot,
    statePath: input.statePath,
    state: preparing,
    options: {
      expectedFingerprint: input.loadedState.fingerprint,
      expectedState: "CREATED"
    }
  });
}

export async function executeStartRunningMutation(
  input: StartRunningMutationInput
): Promise<StartLoadedStateSnapshot> {
  const running = deriveStartRunningState({
    preparingState: input.preparingState,
    lastCommandAt: input.nowIso,
    bubbleId: input.bubbleId,
    implementer: input.implementer,
    reviewer: input.reviewer,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
    ideationPending: input.ideationPending
  });

  return persistStateViaMutationBoundary({
    write: input.writeStateSnapshot,
    statePath: input.statePath,
    state: running,
    options: {
      expectedFingerprint: input.preparingFingerprint,
      expectedState: "PREPARING_WORKSPACE"
    }
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

  return persistStateViaMutationBoundary({
    write: input.writeStateSnapshot,
    statePath: input.statePath,
    state: resumed,
    options: {
      expectedFingerprint: input.loadedState.fingerprint,
      expectedState: input.loadedState.state.state
    }
  });
}

export async function executeStartFailedCleanupMutation(
  input: StartFailedMutationInput
): Promise<StartLoadedStateSnapshot> {
  const failed = deriveStartFailedCleanupState({
    preparingState: input.preparingState,
    lastCommandAt: input.nowIso
  });

  return persistStateViaMutationBoundary({
    write: input.writeStateSnapshot,
    statePath: input.statePath,
    state: failed,
    options: {
      expectedState: "PREPARING_WORKSPACE"
    }
  });
}
