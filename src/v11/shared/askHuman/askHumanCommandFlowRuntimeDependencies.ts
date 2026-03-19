import { buildAskHumanFlowDependencies } from "./askHumanFlowInvocationBuilders.js";
import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";

export function buildAskHumanCommandFlowRuntimeDependencies(
  dependencies: AskHumanCommandOrchestrationDependencies
): RunAskHumanFlowDependencies {
  return buildAskHumanFlowDependencies({
    executeAskHumanExecution: dependencies.executeAskHumanExecution,
    finalizeAskHumanFlow: dependencies.finalizeAskHumanFlow,
    emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
    emitBubbleNotification: dependencies.emitBubbleNotification
  });
}
