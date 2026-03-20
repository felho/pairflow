import type { BuildAskHumanEntrypointInvocationInput } from "./askHumanEntrypointInvocationContract.js";
import { buildAskHumanOrchestrationInput } from "./askHumanOrchestrationInputBuilder.js";

export function buildAskHumanEntrypointInvocation(
  input: BuildAskHumanEntrypointInvocationInput
){
  return buildAskHumanOrchestrationInput(
    input.normalizedInput,
    input.createError
  );
}
