import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";

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

export function resolveAskHumanExecutionDependencies(
  input: ResolveAskHumanExecutionDependenciesInput
): ResolvedAskHumanExecutionDependencies {
  return {
    appendEnvelope: input.appendProtocolEnvelope ?? appendProtocolEnvelope,
    writeSnapshot: input.writeStateSnapshot ?? writeStateSnapshot,
    applyTransition: input.applyStateTransition ?? applyStateTransition
  };
}
