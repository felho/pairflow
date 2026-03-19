import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { AskHumanRunningState } from "./askHumanRoutingContext.js";
import { runAskHumanRunningStateValidationChecks } from "./askHumanRunningStateValidationChecks.js";

export function assertAskHumanRunningState(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): asserts state is AskHumanRunningState {
  runAskHumanRunningStateValidationChecks(state, createError);
}
