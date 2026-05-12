import { applyStateTransition } from "../../domain/state/machine.js";
import { buildBubbleStateSnapshotVariant } from "../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../domain/state/snapshot/projection.js";
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
  // applyStateTransition is still persisted-shape (later batch). Project at
  // the boundary and rebuild the variant from the output.
  const cancelled = buildBubbleStateSnapshotVariant(
    applyStateTransition(toPersistedSnapshot(input.loadedState.state), {
      to: "CANCELLED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.nowIso
    })
  );

  return input.writeStateSnapshot(input.statePath, cancelled, {
    expectedFingerprint: input.loadedState.fingerprint
  });
}
