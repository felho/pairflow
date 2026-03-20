import type { AskHumanCommandOrchestrationInvocation } from "./askHumanCommandOrchestrationInvocationContract.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput
} from "./askHumanCommandOrchestrationContract.js";

export interface AskHumanCommandOrchestrationCallInput {
  input: AskHumanCommandOrchestrationInput;
  dependencies: AskHumanCommandOrchestrationDependencies;
}

export function buildAskHumanCommandOrchestrationCallInput(
  invocation: AskHumanCommandOrchestrationInvocation
): AskHumanCommandOrchestrationCallInput {
  return {
    input: invocation.orchestrationInput,
    dependencies: invocation.orchestrationDependencies
  };
}
