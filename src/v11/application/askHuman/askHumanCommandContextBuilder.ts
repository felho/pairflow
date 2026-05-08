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
    orchestrationInput: {
      question: normalizedInput.question,
      refs: normalizedInput.refs,
      cwd: normalizedInput.cwd,
      authoritativeContext: normalizedInput.authoritativeContext,
      now: normalizedInput.now,
      createError: input.createError
    }
  };
}
