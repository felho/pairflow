import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";
import type { BuildAskHumanFlowDependenciesInput } from "./askHumanFlowInvocationContract.js";

export function buildAskHumanFlowDependencyOptionalOverrides(
  input: BuildAskHumanFlowDependenciesInput
): Partial<RunAskHumanFlowDependencies> {
  const emitDeliveryNotificationAck =
    input.emitDeliveryNotificationAck ?? input.emitTmuxDeliveryNotification;

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
    ...(emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck }
      : {}),
    ...(input.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: input.emitBubbleNotification }
      : {})
  };
}
