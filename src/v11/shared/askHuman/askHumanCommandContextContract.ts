import type { EmitAskHumanInput } from "./askHumanCommandContract.js";
import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestrationContract.js";

export interface BuildAskHumanCommandContextInput {
  commandInput: EmitAskHumanInput;
  createError: (message: string) => Error;
}

export interface AskHumanCommandContext {
  orchestrationInput: AskHumanCommandOrchestrationInput;
}
