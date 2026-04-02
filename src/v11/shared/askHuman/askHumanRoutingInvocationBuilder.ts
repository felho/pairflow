import type { PrepareAskHumanRoutingInput } from "./askHumanRoutingContract.js";
import type { BuildAskHumanRoutingInputInput } from "./askHumanRoutingInvocationContract.js";

export function buildAskHumanRoutingInput(
  input: BuildAskHumanRoutingInputInput
): PrepareAskHumanRoutingInput {
  return {
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    ...(input.authoritativeContext !== undefined
      ? { authoritativeContext: input.authoritativeContext }
      : {}),
    now: input.now,
    createError: input.createError
  };
}
