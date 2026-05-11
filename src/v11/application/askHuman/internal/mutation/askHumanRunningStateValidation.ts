import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { AskHumanRunningState } from "../delivery/askHumanRoutingContextContract.js";
import { runAskHumanRunningStateValidationChecks } from "./askHumanRunningStateValidationChecks.js";

export function assertAskHumanRunningState(
  state: PersistedBubbleStateSnapshot,
  createError: PairflowCreateCommandError
): asserts state is AskHumanRunningState {
  runAskHumanRunningStateValidationChecks(state, createError);
}
