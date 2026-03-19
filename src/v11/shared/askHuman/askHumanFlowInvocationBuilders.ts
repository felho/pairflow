import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowInput
} from "./askHumanFlowContract.js";
import type {
  BuildAskHumanFlowDependenciesInput,
  BuildAskHumanFlowInputInput
} from "./askHumanFlowInvocationContract.js";

export function buildAskHumanFlowInput(
  input: BuildAskHumanFlowInputInput
): RunAskHumanFlowInput {
  return {
    now: input.now,
    routing: input.routing,
    createError: input.createError
  };
}

export function buildAskHumanFlowDependencies(
  input: BuildAskHumanFlowDependenciesInput
): RunAskHumanFlowDependencies {
  return {
    executeAskHumanExecution: input.executeAskHumanExecution,
    finalizeAskHumanFlow: input.finalizeAskHumanFlow,
    ...(input.appendProtocolEnvelope !== undefined
      ? { appendProtocolEnvelope: input.appendProtocolEnvelope }
      : {}),
    ...(input.writeStateSnapshot !== undefined
      ? { writeStateSnapshot: input.writeStateSnapshot }
      : {}),
    ...(input.applyStateTransition !== undefined
      ? { applyStateTransition: input.applyStateTransition }
      : {}),
    ...(input.emitTmuxDeliveryNotification !== undefined
      ? { emitTmuxDeliveryNotification: input.emitTmuxDeliveryNotification }
      : {}),
    ...(input.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: input.emitBubbleNotification }
      : {})
  };
}
