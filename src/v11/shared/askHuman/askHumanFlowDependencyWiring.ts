import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import { forwardAskHumanRuntimeNotificationDependencies } from "./askHumanRuntimeDependencyForwarding.js";
import { createAskHumanFlowStepDependencies } from "./askHumanFlowStepDependencyWiring.js";
import type { AskHumanFlowRuntimeDependencies } from "./askHumanFlowDependencyWiringContract.js";

export function createAskHumanCommandOrchestrationDependencies(
  runtimeDependencies: AskHumanFlowRuntimeDependencies
): AskHumanCommandOrchestrationDependencies {
  return {
    ...createAskHumanFlowStepDependencies(),
    ...forwardAskHumanRuntimeNotificationDependencies(runtimeDependencies)
  };
}
