import { prepareAskHumanRouting } from "../../application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../application/askHuman/runAskHumanFlow.js";

export interface ResolveAskHumanCommandOrchestrationDependenciesInput {
  prepareAskHumanRouting?: typeof prepareAskHumanRouting | undefined;
  runAskHumanFlow?: typeof runAskHumanFlow | undefined;
}

export interface ResolvedAskHumanCommandOrchestrationDependencies {
  prepareAskHumanRouting: typeof prepareAskHumanRouting;
  runAskHumanFlow: typeof runAskHumanFlow;
}

export function resolveAskHumanCommandOrchestrationDependencies(
  input: ResolveAskHumanCommandOrchestrationDependenciesInput
): ResolvedAskHumanCommandOrchestrationDependencies {
  return {
    prepareAskHumanRouting: input.prepareAskHumanRouting ?? prepareAskHumanRouting,
    runAskHumanFlow: input.runAskHumanFlow ?? runAskHumanFlow
  };
}
