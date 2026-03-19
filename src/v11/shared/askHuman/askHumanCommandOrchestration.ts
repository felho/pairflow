import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { prepareAskHumanRouting } from "../../application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../application/askHuman/runAskHumanFlow.js";
import {
  buildAskHumanFlowDependencies,
  buildAskHumanFlowInput,
  buildAskHumanRoutingInput
} from "./askHumanFlowInvocationBuilders.js";
import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowResult
} from "../../application/askHuman/runAskHumanFlow.js";

export interface AskHumanCommandOrchestrationInput {
  question: string;
  refs?: string[] | undefined;
  cwd?: string | undefined;
  now: Date;
  createError: (message: string) => Error;
}

export interface AskHumanCommandOrchestrationDependencies {
  executeAskHumanExecution:
    RunAskHumanFlowDependencies["executeAskHumanExecution"];
  finalizeAskHumanFlow:
    RunAskHumanFlowDependencies["finalizeAskHumanFlow"];
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
  prepareAskHumanRouting?: typeof prepareAskHumanRouting;
  runAskHumanFlow?: typeof runAskHumanFlow;
}

export async function orchestrateAskHumanCommand(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies
): Promise<RunAskHumanFlowResult> {
  const prepareRouting = dependencies.prepareAskHumanRouting ?? prepareAskHumanRouting;
  const runFlow = dependencies.runAskHumanFlow ?? runAskHumanFlow;

  const routing = await prepareRouting(
    buildAskHumanRoutingInput({
      question: input.question,
      refs: input.refs,
      cwd: input.cwd,
      now: input.now,
      createError: input.createError
    })
  );

  return runFlow(
    buildAskHumanFlowInput({
      now: input.now,
      routing,
      createError: input.createError
    }),
    buildAskHumanFlowDependencies({
      executeAskHumanExecution: dependencies.executeAskHumanExecution,
      finalizeAskHumanFlow: dependencies.finalizeAskHumanFlow,
      emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: dependencies.emitBubbleNotification
    })
  );
}
