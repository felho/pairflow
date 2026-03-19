import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowInput
} from "../../application/askHuman/runAskHumanFlow.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface BuildAskHumanFlowInputInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: (message: string) => Error;
}

export function buildAskHumanFlowInput(
  input: BuildAskHumanFlowInputInput
): RunAskHumanFlowInput {
  return {
    now: input.now,
    routing: input.routing,
    createError: input.createError
  };
}

export interface BuildAskHumanFlowDependenciesInput {
  executeAskHumanExecution:
    RunAskHumanFlowDependencies["executeAskHumanExecution"];
  finalizeAskHumanFlow:
    RunAskHumanFlowDependencies["finalizeAskHumanFlow"];
  appendProtocolEnvelope?: RunAskHumanFlowDependencies["appendProtocolEnvelope"];
  writeStateSnapshot?: RunAskHumanFlowDependencies["writeStateSnapshot"];
  applyStateTransition?: RunAskHumanFlowDependencies["applyStateTransition"];
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
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
