import {
  buildAskHumanFlowDependencies,
  buildAskHumanFlowInput
} from "./askHumanFlowInvocationBuilders.js";
import { buildAskHumanRoutingInput } from "./askHumanRoutingInvocationBuilder.js";
import { resolveAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolution.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput,
  AskHumanCommandOrchestrationResult
} from "./askHumanCommandOrchestrationContract.js";

export async function orchestrateAskHumanCommand(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies
): Promise<AskHumanCommandOrchestrationResult> {
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
