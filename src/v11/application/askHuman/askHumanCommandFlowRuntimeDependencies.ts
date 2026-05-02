import { buildAskHumanFlowDependencies } from "./askHumanFlowInvocationBuilders.js";
import { buildAskHumanFlowDependenciesInputFromCommandOrchestration } from "./askHumanCommandFlowDependencyInputBuilder.js";
import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";

export function buildAskHumanCommandFlowRuntimeDependencies(
  dependencies: AskHumanCommandOrchestrationDependencies
): RunAskHumanFlowDependencies {
  return buildAskHumanFlowDependencies(
    buildAskHumanFlowDependenciesInputFromCommandOrchestration(dependencies)
  );
}
