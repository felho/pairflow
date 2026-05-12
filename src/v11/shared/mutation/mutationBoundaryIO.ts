import type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import type {
  LoadedStateSnapshot,
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
