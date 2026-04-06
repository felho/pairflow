import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import type { ActorEmitContextSnapshot } from "../../../core/bubble/actorEmitContext.js";
import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowFn,
  RunAskHumanFlowResult
} from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";

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
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
  prepareAskHumanRouting?: PrepareAskHumanRoutingFn;
  runAskHumanFlow?: RunAskHumanFlowFn;
}

export type AskHumanCommandOrchestrationResult = RunAskHumanFlowResult;
