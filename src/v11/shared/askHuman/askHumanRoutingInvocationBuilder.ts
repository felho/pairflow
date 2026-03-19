import type { PrepareAskHumanRoutingInput } from "./askHumanRoutingContract.js";

export interface BuildAskHumanRoutingInputInput {
  question: string;
  refs: string[] | undefined;
  cwd: string | undefined;
  now: Date;
  createError: (message: string) => Error;
}

export function buildAskHumanRoutingInput(
  input: BuildAskHumanRoutingInputInput
): PrepareAskHumanRoutingInput {
  return {
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now: input.now,
    createError: input.createError
  };
}
