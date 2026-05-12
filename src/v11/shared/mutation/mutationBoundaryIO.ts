import type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import type {
  LoadedDomainStateSnapshot,
  LoadedStateSnapshot,
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
