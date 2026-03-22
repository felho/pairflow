import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput
} from "./askHumanCommandContract.js";

export interface AskHumanCommandDispatchInput {
  input: EmitAskHumanInput;
  dependencies: EmitAskHumanDependencies;
  createError: PairflowCreateCommandError;
}

export function buildAskHumanCommandDispatchInput(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: PairflowCreateCommandError
): AskHumanCommandDispatchInput {
  return {
    input,
    dependencies,
    createError
  };
}
