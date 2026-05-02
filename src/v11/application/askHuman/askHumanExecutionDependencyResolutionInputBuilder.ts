import type { ExecuteAskHumanExecutionDependencies } from "./askHumanFlowContract.js";
import type { ResolveAskHumanExecutionDependenciesInput } from "./askHumanExecutionDependencyResolutionContract.js";

export function buildAskHumanExecutionDependencyResolutionInput(
  dependencies: ExecuteAskHumanExecutionDependencies
): ResolveAskHumanExecutionDependenciesInput {
  return {
    appendProtocolEnvelope: dependencies.appendProtocolEnvelope,
    writeStateSnapshot: dependencies.writeStateSnapshot,
    applyStateTransition: dependencies.applyStateTransition
  };
}
