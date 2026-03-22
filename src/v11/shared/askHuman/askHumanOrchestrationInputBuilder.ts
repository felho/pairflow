import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestrationContract.js";
import type { BuildAskHumanEntrypointInvocationInput } from "./askHumanEntrypointInvocationContract.js";

export function buildAskHumanOrchestrationInput(
  normalizedInput: BuildAskHumanEntrypointInvocationInput["normalizedInput"],
  createError: PairflowCreateCommandError
): AskHumanCommandOrchestrationInput {
  return {
    question: normalizedInput.question,
    refs: normalizedInput.refs,
    cwd: normalizedInput.cwd,
    now: normalizedInput.now,
    createError
  };
}
