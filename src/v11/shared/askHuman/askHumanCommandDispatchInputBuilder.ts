import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput
} from "./askHumanCommandContract.js";

export interface AskHumanCommandDispatchInput {
  input: EmitAskHumanInput;
  dependencies: EmitAskHumanDependencies;
  createError: (message: string) => Error;
}

export function buildAskHumanCommandDispatchInput(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: (message: string) => Error
): AskHumanCommandDispatchInput {
  return {
    input,
    dependencies,
    createError
  };
}
