import type { applyStateTransition } from "../../domain/state/machine.js";
import type { AppendProtocolEnvelopePort } from "../ports/transcript.js";
import type { WriteStateSnapshotPort } from "../ports/stateSnapshots.js";

export interface AskHumanExecutionDependencySource {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  applyStateTransition?: typeof applyStateTransition;
}

export interface AskHumanExecutionDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  applyStateTransition?: typeof applyStateTransition;
}
