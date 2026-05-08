import { createAskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaults.js";
import type {
  ResolvedAskHumanCommandOrchestrationDependencies,
  ResolveAskHumanCommandOrchestrationDependenciesInput
} from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export function resolveAskHumanCommandOrchestrationDependencies(
  input: ResolveAskHumanCommandOrchestrationDependenciesInput
): ResolvedAskHumanCommandOrchestrationDependencies {
  const defaults = createAskHumanCommandFlowDefaults();
  return {
    prepareAskHumanRouting:
      input.prepareAskHumanRouting ?? defaults.prepareAskHumanRouting,
    runAskHumanFlow: input.runAskHumanFlow ?? defaults.runAskHumanFlow
  };
}
