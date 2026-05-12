import { buildBubbleStateSnapshotVariant } from "../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../domain/state/snapshot/projection.js";
import type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import type {
  LoadedDomainStateSnapshot,
  LoadedStateSnapshot,
  ReadDomainStateSnapshotPort,
  ReadStateSnapshotPort,
  WriteDomainStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export async function appendEnvelopeViaMutationBoundary(input: {
  append: AppendProtocolEnvelopePort;
  payload: AppendProtocolEnvelopeInput;
}): Promise<AppendProtocolEnvelopeResult> {
  return input.append(input.payload);
}

export async function persistStateViaMutationBoundary(input: {
  write: WriteStateSnapshotPort;
  statePath: Parameters<WriteStateSnapshotPort>[0];
  state: Parameters<WriteStateSnapshotPort>[1];
  options?: WriteStateSnapshotOptions;
}): Promise<LoadedStateSnapshot> {
  return input.write(input.statePath, input.state, input.options);
}

// Variant-aware sibling — Step 4b-β opt-in API. Consumers that hold
// the domain variant union route their persistence through this
// helper instead of persistStateViaMutationBoundary.

export async function persistDomainStateViaMutationBoundary(input: {
  write: WriteDomainStateSnapshotPort;
  statePath: Parameters<WriteDomainStateSnapshotPort>[0];
  state: Parameters<WriteDomainStateSnapshotPort>[1];
  options?: WriteStateSnapshotOptions;
}): Promise<LoadedDomainStateSnapshot> {
  return input.write(input.statePath, input.state, input.options);
}

// Port adapters for lane migration (Step 4b-β). External command
// contracts still supply persisted-shape ports; lanes migrated to the
// variant model wrap those external ports into variant-aware siblings
// at the dependency-resolution boundary so internal mutation helpers
// can hand them BubbleStateSnapshot directly. These adapters live in
// shared/ so application code can import them without crossing the
// application -> infrastructure boundary.

export function adaptPersistedWritePortToDomain(
  persistedPort: WriteStateSnapshotPort
): WriteDomainStateSnapshotPort {
  return async (statePath, state, options) => {
    const result = await persistedPort(statePath, toPersistedSnapshot(state), options);
    return {
      state: buildBubbleStateSnapshotVariant(result.state),
      fingerprint: result.fingerprint
    };
  };
}

export function adaptPersistedReadPortToDomain(
  persistedPort: ReadStateSnapshotPort
): ReadDomainStateSnapshotPort {
  return async (statePath) => {
    const result = await persistedPort(statePath);
    return {
      state: buildBubbleStateSnapshotVariant(result.state),
      fingerprint: result.fingerprint
    };
  };
}
