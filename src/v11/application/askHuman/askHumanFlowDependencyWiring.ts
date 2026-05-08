import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import { executeAskHumanExecution } from "./askHumanExecution.js";
import { finalizeAskHumanFlow } from "./askHumanFinalization.js";
import { forwardAskHumanRuntimeNotificationDependencies } from "./askHumanRuntimeDependencyForwarding.js";
import type { AskHumanFlowRuntimeDependencies } from "./askHumanFlowDependencyWiringContract.js";

export function createAskHumanCommandOrchestrationDependencies(
  runtimeDependencies: AskHumanFlowRuntimeDependencies
): AskHumanCommandOrchestrationDependencies {
  return {
    executeAskHumanExecution,
    finalizeAskHumanFlow,
    ...forwardAskHumanRuntimeNotificationDependencies(runtimeDependencies)
  };
}
