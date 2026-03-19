import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import type {
  ResolvedAskHumanExecutionDependencies,
  ResolveAskHumanExecutionDependenciesInput
} from "./askHumanExecutionDependencyResolutionContract.js";

export function resolveAskHumanExecutionDependencies(
  input: ResolveAskHumanExecutionDependenciesInput
): ResolvedAskHumanExecutionDependencies {
  return {
    appendEnvelope: input.appendProtocolEnvelope ?? appendProtocolEnvelope,
    writeSnapshot: input.writeStateSnapshot ?? writeStateSnapshot,
    applyTransition: input.applyStateTransition ?? applyStateTransition
  };
}
