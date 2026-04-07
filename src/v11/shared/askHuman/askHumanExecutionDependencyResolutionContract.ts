import type { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import type { applyStateTransition } from "../../domain/state/machine.js";
import type { writeStateSnapshot } from "../../../core/state/stateStore.js";

export interface ResolveAskHumanExecutionDependenciesInput {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope | undefined;
  writeStateSnapshot?: typeof writeStateSnapshot | undefined;
  applyStateTransition?: typeof applyStateTransition | undefined;
}

export interface ResolvedAskHumanExecutionDependencies {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeSnapshot: typeof writeStateSnapshot;
  applyTransition: typeof applyStateTransition;
}
