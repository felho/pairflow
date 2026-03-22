import type { BuildAskHumanEntrypointInvocationInput } from "./askHumanEntrypointInvocationContract.js";

export function buildAskHumanEntrypointInvocationInput(
  normalizedInput: BuildAskHumanEntrypointInvocationInput["normalizedInput"],
  createError: PairflowCreateCommandError
): BuildAskHumanEntrypointInvocationInput {
  return {
    normalizedInput,
    createError
  };
}
