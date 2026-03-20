import type {
  EmitAskHumanDependencies
} from "./askHumanCommandContract.js";
import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import { buildAskHumanFlowRuntimeDependenciesFromCommandRuntime } from "./askHumanCommandFlowDependencyWiringInputBuilder.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";

export function buildAskHumanCommandOrchestrationDependencies(
  dependencies: EmitAskHumanDependencies
): AskHumanCommandOrchestrationDependencies {
  return createAskHumanCommandOrchestrationDependencies(
    buildAskHumanFlowRuntimeDependenciesFromCommandRuntime(dependencies)
  );
}
