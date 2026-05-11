import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import type { AskHumanRunningState } from "../delivery/askHumanRoutingContextContract.js";
import { runAskHumanRunningStateValidationChecks } from "./askHumanRunningStateValidationChecks.js";

export function assertAskHumanRunningState(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): asserts state is AskHumanRunningState {
  runAskHumanRunningStateValidationChecks(state, createError);
}
