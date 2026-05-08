import { prepareAskHumanRouting } from "./askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "./runAskHumanFlow.js";
import type {
  ResolvedAskHumanCommandOrchestrationDependencies,
  ResolveAskHumanCommandOrchestrationDependenciesInput
} from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export function resolveAskHumanCommandOrchestrationDependencies(
  input: ResolveAskHumanCommandOrchestrationDependenciesInput
): ResolvedAskHumanCommandOrchestrationDependencies {
  return {
    prepareAskHumanRouting:
      input.prepareAskHumanRouting ?? prepareAskHumanRouting,
    runAskHumanFlow: input.runAskHumanFlow ?? runAskHumanFlow
  };
}
