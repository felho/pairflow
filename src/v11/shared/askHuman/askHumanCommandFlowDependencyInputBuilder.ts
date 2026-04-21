import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationContract.js";
import type { BuildAskHumanFlowDependenciesInput } from "./askHumanFlowInvocationContract.js";

export function buildAskHumanFlowDependenciesInputFromCommandOrchestration(
  dependencies: AskHumanCommandOrchestrationDependencies
): BuildAskHumanFlowDependenciesInput {
  return {
    executeAskHumanExecution: dependencies.executeAskHumanExecution,
    finalizeAskHumanFlow: dependencies.finalizeAskHumanFlow,
    emitDeliveryNotificationAck:
      dependencies.emitDeliveryNotificationAck
      ?? dependencies.emitTmuxDeliveryNotification,
    emitBubbleNotification: dependencies.emitBubbleNotification
  };
}
