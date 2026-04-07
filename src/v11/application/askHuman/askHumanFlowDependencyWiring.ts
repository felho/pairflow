import type { AskHumanCommandOrchestrationDependencies } from "../../shared/askHuman/askHumanCommandOrchestrationContract.js";
import { forwardAskHumanRuntimeNotificationDependencies } from "../../shared/askHuman/askHumanRuntimeDependencyForwarding.js";
import { createAskHumanFlowStepDependencies } from "./askHumanFlowStepDependencyWiring.js";
import type { AskHumanFlowRuntimeDependencies } from "../../shared/askHuman/askHumanFlowDependencyWiringContract.js";

export function createAskHumanCommandOrchestrationDependencies(
  runtimeDependencies: AskHumanFlowRuntimeDependencies
): AskHumanCommandOrchestrationDependencies {
  return {
    ...createAskHumanFlowStepDependencies(),
    ...forwardAskHumanRuntimeNotificationDependencies(runtimeDependencies)
  };
}
