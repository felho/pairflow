import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput
} from "./askHumanCommandContract.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput
} from "./askHumanCommandOrchestrationContract.js";
import { buildAskHumanCommandContext } from "./askHumanCommandContextBuilder.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";

export interface BuildAskHumanCommandOrchestrationInvocationInput {
  commandInput: EmitAskHumanInput;
  runtimeDependencies: EmitAskHumanDependencies;
  createError: (message: string) => Error;
}

export interface AskHumanCommandOrchestrationInvocation {
  orchestrationInput: AskHumanCommandOrchestrationInput;
  orchestrationDependencies: AskHumanCommandOrchestrationDependencies;
}

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
