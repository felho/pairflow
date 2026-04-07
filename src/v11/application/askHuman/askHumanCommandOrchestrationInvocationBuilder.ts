import { buildAskHumanCommandContext } from "../../shared/askHuman/askHumanCommandContextBuilder.js";
import { buildAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyBuilder.js";
import type {
  AskHumanCommandOrchestrationInvocation,
  BuildAskHumanCommandOrchestrationInvocationInput
} from "../../shared/askHuman/askHumanCommandOrchestrationInvocationContract.js";

export function buildAskHumanCommandOrchestrationInvocation(
  input: BuildAskHumanCommandOrchestrationInvocationInput
): AskHumanCommandOrchestrationInvocation {
  const context = buildAskHumanCommandContext({
    commandInput: input.commandInput,
    createError: input.createError
  });

  return {
    orchestrationInput: context.orchestrationInput,
    orchestrationDependencies: buildAskHumanCommandOrchestrationDependencies(
      input.runtimeDependencies
    )
  };
}
