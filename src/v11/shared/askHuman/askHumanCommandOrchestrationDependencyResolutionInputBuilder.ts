import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import type { ResolveAskHumanCommandOrchestrationDependenciesInput } from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export function buildAskHumanCommandOrchestrationDependencyResolutionInput(
  dependencies: AskHumanCommandOrchestrationDependencies
): ResolveAskHumanCommandOrchestrationDependenciesInput {
  return {
    prepareAskHumanRouting: dependencies.prepareAskHumanRouting,
    runAskHumanFlow: dependencies.runAskHumanFlow
  };
}
