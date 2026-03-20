import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestrationContract.js";
import type { PrepareAskHumanRoutingInput } from "./askHumanRoutingContract.js";
import { buildAskHumanRoutingInput } from "./askHumanRoutingInvocationBuilder.js";

export function buildAskHumanRoutingInputFromCommandOrchestration(
  input: AskHumanCommandOrchestrationInput
): PrepareAskHumanRoutingInput {
  return buildAskHumanRoutingInput({
    question: input.question,
    refs: input.refs,
    cwd: input.cwd,
    now: input.now,
    createError: input.createError
  });
}
