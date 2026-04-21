import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort,
  EmitAskHumanTmuxDeliveryNotificationPort
} from "./askHumanDeliveryPortsContract.js";

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
  emitDeliveryNotificationAck?:
    | EmitAskHumanDeliveryNotificationAckPort
    | undefined;
  emitTmuxDeliveryNotification?:
    | EmitAskHumanTmuxDeliveryNotificationPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
