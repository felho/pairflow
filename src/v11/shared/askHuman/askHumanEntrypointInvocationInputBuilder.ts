import type { BuildAskHumanEntrypointInvocationInput } from "./askHumanEntrypointInvocationContract.js";

export function buildAskHumanEntrypointInvocationInput(
  normalizedInput: BuildAskHumanEntrypointInvocationInput["normalizedInput"],
  createError: (message: string) => Error
): BuildAskHumanEntrypointInvocationInput {
  return {
    normalizedInput,
    createError
  };
}
