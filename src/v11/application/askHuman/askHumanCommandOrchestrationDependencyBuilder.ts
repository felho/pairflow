import type {
  EmitAskHumanDependencies
} from "../../shared/askHuman/askHumanCommandContract.js";
import type { AskHumanCommandOrchestrationDependencies } from "../../shared/askHuman/askHumanCommandOrchestrationContract.js";
import { buildAskHumanFlowRuntimeDependenciesFromCommandRuntime } from "../../shared/askHuman/askHumanCommandFlowDependencyWiringInputBuilder.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";

export function buildAskHumanCommandOrchestrationDependencies(
  dependencies: EmitAskHumanDependencies
): AskHumanCommandOrchestrationDependencies {
  return createAskHumanCommandOrchestrationDependencies(
    buildAskHumanFlowRuntimeDependenciesFromCommandRuntime(dependencies)
  );
}
