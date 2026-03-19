import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { PrepareAskHumanRoutingInput } from "../../application/askHuman/askHumanRoutingPreparation.js";
import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowInput
} from "./askHumanFlowContract.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface BuildAskHumanRoutingInputInput {
  question: string;
  refs: string[] | undefined;
  cwd: string | undefined;
  now: Date;
  createError: (message: string) => Error;
}

export function buildAskHumanRoutingInput(
  input: BuildAskHumanRoutingInputInput
): PrepareAskHumanRoutingInput {
  return {
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now: input.now,
    createError: input.createError
  };
}

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
  appendProtocolEnvelope?:
    | RunAskHumanFlowDependencies["appendProtocolEnvelope"]
    | undefined;
  writeStateSnapshot?:
    | RunAskHumanFlowDependencies["writeStateSnapshot"]
    | undefined;
  applyStateTransition?:
    | RunAskHumanFlowDependencies["applyStateTransition"]
    | undefined;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
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
