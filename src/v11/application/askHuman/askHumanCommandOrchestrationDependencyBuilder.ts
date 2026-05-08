import type {
  EmitAskHumanDependencies
} from "./askHumanCommandContract.js";
import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";

export function buildAskHumanCommandOrchestrationDependencies(
  dependencies: EmitAskHumanDependencies
): AskHumanCommandOrchestrationDependencies {
  return createAskHumanCommandOrchestrationDependencies(dependencies);
}
