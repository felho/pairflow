import { resolveAskHumanCommandOrchestrationDependencyDefaults } from "./askHumanCommandOrchestrationDependencyDefaults.js";
import type {
  ResolvedAskHumanCommandOrchestrationDependencies,
  ResolveAskHumanCommandOrchestrationDependenciesInput
} from "../../shared/askHuman/askHumanCommandOrchestrationDependencyResolutionContract.js";

export function resolveAskHumanCommandOrchestrationDependencies(
  input: ResolveAskHumanCommandOrchestrationDependenciesInput
): ResolvedAskHumanCommandOrchestrationDependencies {
  const defaults = resolveAskHumanCommandOrchestrationDependencyDefaults();
  return {
    prepareAskHumanRouting:
      input.prepareAskHumanRouting ?? defaults.prepareAskHumanRouting,
    runAskHumanFlow: input.runAskHumanFlow ?? defaults.runAskHumanFlow
  };
}
