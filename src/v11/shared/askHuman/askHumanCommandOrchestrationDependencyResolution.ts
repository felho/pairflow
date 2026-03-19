import { prepareAskHumanRouting } from "../../application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../application/askHuman/runAskHumanFlow.js";
import type { RunAskHumanFlowFn } from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";

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
  return {
    prepareAskHumanRouting: input.prepareAskHumanRouting ?? prepareAskHumanRouting,
    runAskHumanFlow: input.runAskHumanFlow ?? runAskHumanFlow
  };
}
