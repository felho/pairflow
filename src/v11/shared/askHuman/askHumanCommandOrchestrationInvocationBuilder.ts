import { buildAskHumanCommandContext } from "./askHumanCommandContextBuilder.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";
import type {
  AskHumanCommandOrchestrationInvocation,
  BuildAskHumanCommandOrchestrationInvocationInput
} from "./askHumanCommandOrchestrationInvocationContract.js";

export function buildAskHumanCommandOrchestrationInvocation(
  input: BuildAskHumanCommandOrchestrationInvocationInput
): AskHumanCommandOrchestrationInvocation {
  const context = buildAskHumanCommandContext({
    commandInput: input.commandInput,
    createError: input.createError
  });

  return {
    orchestrationInput: context.orchestrationInput,
    orchestrationDependencies: createAskHumanCommandOrchestrationDependencies({
      emitTmuxDeliveryNotification:
        input.runtimeDependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: input.runtimeDependencies.emitBubbleNotification
    })
  };
}
