import { applyStateTransition } from "../../domain/state/machine.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export interface StopCancellationMutationInput {
  statePath: string;
  loadedState: LoadedStateSnapshot;
  nowIso: string;
  writeStateSnapshot: WriteStateSnapshotPort;
}

export async function executeStopCancellationMutation(
  input: StopCancellationMutationInput
): Promise<LoadedStateSnapshot> {
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
