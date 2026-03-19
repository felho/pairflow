import type { RunAskHumanFlowFn } from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";
import { createAskHumanCommandFlowDefaults } from "./askHumanCommandFlowDefaults.js";

export interface ResolveAskHumanCommandOrchestrationDependenciesInput {
  prepareAskHumanRouting?: PrepareAskHumanRoutingFn | undefined;
  runAskHumanFlow?: RunAskHumanFlowFn | undefined;
}

export interface ResolvedAskHumanCommandOrchestrationDependencies {
  prepareAskHumanRouting: PrepareAskHumanRoutingFn;
  runAskHumanFlow: RunAskHumanFlowFn;
}

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
