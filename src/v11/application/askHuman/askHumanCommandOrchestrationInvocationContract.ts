import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput
} from "./askHumanCommandContract.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput
} from "./askHumanCommandOrchestrationContract.js";

export interface BuildAskHumanCommandOrchestrationInvocationInput {
  commandInput: EmitAskHumanInput;
  runtimeDependencies: EmitAskHumanDependencies;
  createError: PairflowCreateCommandError;
}

export interface AskHumanCommandOrchestrationInvocation {
  orchestrationInput: AskHumanCommandOrchestrationInput;
  orchestrationDependencies: AskHumanCommandOrchestrationDependencies;
}
