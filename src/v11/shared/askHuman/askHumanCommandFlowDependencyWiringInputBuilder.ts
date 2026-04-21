import type { EmitAskHumanDependencies } from "./askHumanCommandContract.js";
import type { AskHumanFlowRuntimeDependencies } from "./askHumanFlowDependencyWiringContract.js";

export function buildAskHumanFlowRuntimeDependenciesFromCommandRuntime(
  dependencies: EmitAskHumanDependencies
): AskHumanFlowRuntimeDependencies {
  return {
    emitDeliveryNotificationAck:
      dependencies.emitDeliveryNotificationAck,
    emitBubbleNotification: dependencies.emitBubbleNotification
  };
}
