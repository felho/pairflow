import type {
  ResolvedAskHumanExecutionDependencies,
  ResolveAskHumanExecutionDependenciesInput
} from "./askHumanExecutionDependencyResolutionContract.js";
import { askHumanExecutionDependencyDefaults } from "./askHumanExecutionDependencyDefaults.js";

export function resolveAskHumanExecutionDependencies(
  input: ResolveAskHumanExecutionDependenciesInput
): ResolvedAskHumanExecutionDependencies {
  return {
    appendEnvelope:
      input.appendProtocolEnvelope
      ?? askHumanExecutionDependencyDefaults.appendProtocolEnvelope,
    writeSnapshot:
      input.writeStateSnapshot
      ?? askHumanExecutionDependencyDefaults.writeStateSnapshot,
    applyTransition:
      input.applyStateTransition
      ?? askHumanExecutionDependencyDefaults.applyStateTransition
  };
}
