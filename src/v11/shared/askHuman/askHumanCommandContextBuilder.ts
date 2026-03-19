import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestration.js";
import type { EmitAskHumanInput } from "./askHumanCommandContract.js";
import { normalizeAskHumanCommandInput } from "./askHumanCommandInputNormalization.js";
import { buildAskHumanEntrypointInvocation } from "./askHumanEntrypointInvocationBuilder.js";

export interface BuildAskHumanCommandContextInput {
  commandInput: EmitAskHumanInput;
  createError: (message: string) => Error;
}

export interface AskHumanCommandContext {
  orchestrationInput: AskHumanCommandOrchestrationInput;
}

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
