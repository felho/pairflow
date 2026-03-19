import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { executeAskHumanExecution } from "../../application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../application/askHuman/askHumanFinalization.js";
import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestration.js";

export interface AskHumanFlowRuntimeDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}

export function createAskHumanCommandOrchestrationDependencies(
  runtimeDependencies: AskHumanFlowRuntimeDependencies
): AskHumanCommandOrchestrationDependencies {
  return {
    executeAskHumanExecution,
    finalizeAskHumanFlow,
    ...(runtimeDependencies.emitTmuxDeliveryNotification !== undefined
      ? {
          emitTmuxDeliveryNotification:
            runtimeDependencies.emitTmuxDeliveryNotification
        }
      : {}),
    ...(runtimeDependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: runtimeDependencies.emitBubbleNotification }
      : {})
  };
}
