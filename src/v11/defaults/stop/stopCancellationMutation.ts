import { applyStateTransition } from "../../domain/state/machine.js";
import type { BubbleLifecycleState } from "../../../contracts/kernel/lifecycle.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";

export interface StopCancellationLoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface StopCancellationWriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
  lockTimeoutMs?: number;
}

export interface StopCancellationMutationInput {
  statePath: string;
  loadedState: StopCancellationLoadedStateSnapshot;
  nowIso: string;
  writeStateSnapshot: (
    statePath: string,
    state: BubbleStateSnapshot,
    options?: StopCancellationWriteStateSnapshotOptions
  ) => Promise<StopCancellationLoadedStateSnapshot>;
}

export async function executeStopCancellationMutation(
  input: StopCancellationMutationInput
): Promise<StopCancellationLoadedStateSnapshot> {
  const cancelled = applyStateTransition(input.loadedState.state, {
    to: "CANCELLED",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });

  return input.writeStateSnapshot(input.statePath, cancelled, {
    expectedFingerprint: input.loadedState.fingerprint
  });
}
