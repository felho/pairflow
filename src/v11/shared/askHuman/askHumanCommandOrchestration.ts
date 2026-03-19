import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import {
  buildAskHumanFlowDependencies,
  buildAskHumanFlowInput,
  buildAskHumanRoutingInput
} from "./askHumanFlowInvocationBuilders.js";
import { resolveAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolution.js";
import type {
  RunAskHumanFlowFn,
  RunAskHumanFlowDependencies,
  RunAskHumanFlowResult
} from "./askHumanFlowContract.js";
import type { PrepareAskHumanRoutingFn } from "./askHumanRoutingContract.js";

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
  prepareAskHumanRouting?: PrepareAskHumanRoutingFn;
  runAskHumanFlow?: RunAskHumanFlowFn;
}

export async function orchestrateAskHumanCommand(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies
): Promise<RunAskHumanFlowResult> {
  const resolvedDependencies = resolveAskHumanCommandOrchestrationDependencies({
    prepareAskHumanRouting: dependencies.prepareAskHumanRouting,
    runAskHumanFlow: dependencies.runAskHumanFlow
  });

  const routing = await resolvedDependencies.prepareAskHumanRouting(
    buildAskHumanRoutingInput({
      question: input.question,
      refs: input.refs,
      cwd: input.cwd,
      now: input.now,
      createError: input.createError
    })
  );

  return resolvedDependencies.runAskHumanFlow(
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
