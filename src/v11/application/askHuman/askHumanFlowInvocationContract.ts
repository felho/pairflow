import type { RunAskHumanFlowDependencies } from "./askHumanFlowContract.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContextContract.js";
import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type { EmitDeliveryNotificationAckPort } from "../../ports/tmuxDelivery.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";

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
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | EmitBubbleLifecycleEventBestEffortPort
    | undefined;
}
