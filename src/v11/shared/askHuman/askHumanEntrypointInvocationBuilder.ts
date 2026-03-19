import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestrationContract.js";
import type { BuildAskHumanEntrypointInvocationInput } from "./askHumanEntrypointInvocationContract.js";

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
