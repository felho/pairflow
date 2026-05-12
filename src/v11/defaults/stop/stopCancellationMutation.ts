import { applyStateTransition } from "../../domain/state/machine.js";
import type {
  LoadedDomainStateSnapshot,
  WriteDomainStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export interface StopCancellationMutationInput {
  statePath: string;
  loadedState: LoadedDomainStateSnapshot;
  nowIso: string;
  writeStateSnapshot: WriteDomainStateSnapshotPort;
}

export async function executeStopCancellationMutation(
  input: StopCancellationMutationInput
): Promise<LoadedDomainStateSnapshot> {
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
