import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestrationContract.js";

export interface BuildAskHumanEntrypointInvocationInput {
  normalizedInput: {
    question: string;
    refs?: string[] | undefined;
    cwd?: string | undefined;
    now: Date;
  };
  createError: (message: string) => Error;
}

export function buildAskHumanEntrypointInvocation(
  input: BuildAskHumanEntrypointInvocationInput
): AskHumanCommandOrchestrationInput {
  return {
    question: input.normalizedInput.question,
    refs: input.normalizedInput.refs,
    cwd: input.normalizedInput.cwd,
    now: input.normalizedInput.now,
    createError: input.createError
  };
}
