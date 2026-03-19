import { normalizeAskHumanCommandInput } from "./askHumanCommandInputNormalization.js";
import { buildAskHumanEntrypointInvocation } from "./askHumanEntrypointInvocationBuilder.js";
import type {
  AskHumanCommandContext,
  BuildAskHumanCommandContextInput
} from "./askHumanCommandContextContract.js";

export function buildAskHumanCommandContext(
  input: BuildAskHumanCommandContextInput
): AskHumanCommandContext {
  const normalizedInput = normalizeAskHumanCommandInput({
    question: input.commandInput.question,
    refs: input.commandInput.refs,
    cwd: input.commandInput.cwd,
    now: input.commandInput.now
  });

  return {
    orchestrationInput: buildAskHumanEntrypointInvocation({
      normalizedInput,
      createError: input.createError
    })
  };
}
