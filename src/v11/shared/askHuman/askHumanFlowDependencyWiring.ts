import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { AskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestration.js";
import { forwardAskHumanRuntimeNotificationDependencies } from "./askHumanRuntimeDependencyForwarding.js";
import { createAskHumanFlowStepDependencies } from "./askHumanFlowStepDependencyWiring.js";

export interface AskHumanFlowRuntimeDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}

export function createAskHumanCommandOrchestrationDependencies(
  runtimeDependencies: AskHumanFlowRuntimeDependencies
): AskHumanCommandOrchestrationDependencies {
  return {
    ...createAskHumanFlowStepDependencies(),
    ...forwardAskHumanRuntimeNotificationDependencies(runtimeDependencies)
  };
}
