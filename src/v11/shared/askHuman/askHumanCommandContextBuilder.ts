import { buildAskHumanEntrypointInvocation } from "./askHumanEntrypointInvocationBuilder.js";
import { buildNormalizedAskHumanCommandInput } from "./askHumanCommandNormalizedInputBuilder.js";
import type {
  AskHumanCommandContext,
  BuildAskHumanCommandContextInput
} from "./askHumanCommandContextContract.js";

export function buildAskHumanCommandContext(
  input: BuildAskHumanCommandContextInput
): AskHumanCommandContext {
  const normalizedInput = buildNormalizedAskHumanCommandInput(input.commandInput);

  return {
    orchestrationInput: buildAskHumanEntrypointInvocation({
      normalizedInput,
      createError: input.createError
    })
  };
}
