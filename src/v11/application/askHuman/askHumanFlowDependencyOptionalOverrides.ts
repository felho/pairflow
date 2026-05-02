import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";
import type { BuildAskHumanFlowDependenciesInput } from "./askHumanFlowInvocationContract.js";

export function buildAskHumanFlowDependencyOptionalOverrides(
  input: BuildAskHumanFlowDependenciesInput
): Partial<RunAskHumanFlowDependencies> {
  return {
    ...(input.appendProtocolEnvelope !== undefined
      ? { appendProtocolEnvelope: input.appendProtocolEnvelope }
      : {}),
    ...(input.writeStateSnapshot !== undefined
      ? { writeStateSnapshot: input.writeStateSnapshot }
      : {}),
    ...(input.applyStateTransition !== undefined
      ? { applyStateTransition: input.applyStateTransition }
      : {}),
    ...(input.emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck: input.emitDeliveryNotificationAck }
      : {}),
    ...(input.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: input.emitBubbleNotification }
      : {})
  };
}
