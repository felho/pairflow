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
