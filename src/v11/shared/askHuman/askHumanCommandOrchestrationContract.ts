import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowFn,
  RunAskHumanFlowResult
} from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";
import type { EmitDeliveryNotificationAckPort } from "../ports/tmuxDelivery.js";

export interface AskHumanCommandOrchestrationInput {
  question: string;
  refs?: string[] | undefined;
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now: Date;
  createError: PairflowCreateCommandError;
}

export interface AskHumanCommandOrchestrationDependencies {
  executeAskHumanExecution:
    RunAskHumanFlowDependencies["executeAskHumanExecution"];
  finalizeAskHumanFlow:
    RunAskHumanFlowDependencies["finalizeAskHumanFlow"];
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  prepareAskHumanRouting?: PrepareAskHumanRoutingFn;
  runAskHumanFlow?: RunAskHumanFlowFn;
}

export type AskHumanCommandOrchestrationResult = RunAskHumanFlowResult;
