import type { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import type { applyStateTransition } from "../../../core/state/machine.js";
import type { writeStateSnapshot } from "../../../core/state/stateStore.js";

export interface AskHumanExecutionDependencySource {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}

export interface AskHumanExecutionDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}
