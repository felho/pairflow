import type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import type { ProtocolMessageType } from "../../../contracts/kernel/protocol.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export async function appendEnvelopeViaMutationBoundary<
  TType extends ProtocolMessageType
>(input: {
  append: AppendProtocolEnvelopePort;
  payload: AppendProtocolEnvelopeInput<TType>;
}): Promise<AppendProtocolEnvelopeResult<TType>> {
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
