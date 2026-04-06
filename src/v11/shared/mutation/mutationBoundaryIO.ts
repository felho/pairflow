import type { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import type { writeStateSnapshot } from "../../infrastructure/state/stateStore.js";

type AppendProtocolEnvelopeInput = Parameters<typeof appendProtocolEnvelope>[0];
type AppendProtocolEnvelopeResult = Awaited<ReturnType<typeof appendProtocolEnvelope>>;
type WriteStatePath = Parameters<typeof writeStateSnapshot>[0];
type WriteStateValue = Parameters<typeof writeStateSnapshot>[1];
type WriteStateOptions = Parameters<typeof writeStateSnapshot>[2];
type WriteStateResult = Awaited<ReturnType<typeof writeStateSnapshot>>;

export async function appendEnvelopeViaMutationBoundary(input: {
  append: typeof appendProtocolEnvelope;
  payload: AppendProtocolEnvelopeInput;
}): Promise<AppendProtocolEnvelopeResult> {
  return input.append(input.payload);
}

export async function persistStateViaMutationBoundary(input: {
  write: typeof writeStateSnapshot;
  statePath: WriteStatePath;
  state: WriteStateValue;
  options?: WriteStateOptions;
}): Promise<WriteStateResult> {
  return input.write(input.statePath, input.state, input.options);
}
