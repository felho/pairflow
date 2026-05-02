import type { AppendProtocolEnvelopePort } from "../../shared/ports/transcript.js";
import type { applyStateTransition } from "../../domain/state/machine.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";

export interface ResolveAskHumanExecutionDependenciesInput {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort | undefined;
  writeStateSnapshot?: WriteStateSnapshotPort | undefined;
  applyStateTransition?: typeof applyStateTransition | undefined;
}

export interface ResolvedAskHumanExecutionDependencies {
  appendEnvelope: AppendProtocolEnvelopePort;
  writeSnapshot: WriteStateSnapshotPort;
  applyTransition: typeof applyStateTransition;
}
