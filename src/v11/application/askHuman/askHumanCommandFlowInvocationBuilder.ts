import type { RunAskHumanFlowInput } from "./askHumanFlowContract.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContextContract.js";
import type { AskHumanCommandOrchestrationInput } from "./askHumanCommandOrchestrationContract.js";
import { buildAskHumanFlowInput } from "./askHumanFlowInvocationBuilders.js";

export function buildAskHumanFlowInputFromCommandOrchestration(
  input: AskHumanCommandOrchestrationInput,
  routing: AskHumanRoutingContext
): RunAskHumanFlowInput {
  return buildAskHumanFlowInput({
    now: input.now,
    routing,
    createError: input.createError
  });
}
