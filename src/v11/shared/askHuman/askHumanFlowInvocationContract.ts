import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface BuildAskHumanFlowInputInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: PairflowCreateCommandError;
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
