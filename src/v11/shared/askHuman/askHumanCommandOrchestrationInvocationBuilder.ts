import { buildAskHumanCommandContext } from "./askHumanCommandContextBuilder.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";
import { buildAskHumanFlowRuntimeDependenciesFromCommandRuntime } from "./askHumanCommandFlowDependencyWiringInputBuilder.js";
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
    orchestrationDependencies: createAskHumanCommandOrchestrationDependencies(
      buildAskHumanFlowRuntimeDependenciesFromCommandRuntime(
        input.runtimeDependencies
      )
    )
  };
}
