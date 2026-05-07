import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import { applyStateTransition } from "./machine.js";

export interface DeriveWatchdogWaitingHumanStateInput {
  state: BubbleStateSnapshot;
  lastCommandAt: string;
}

export function deriveWatchdogWaitingHumanState(
  input: DeriveWatchdogWaitingHumanStateInput
): BubbleStateSnapshot {
  return applyStateTransition(input.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.lastCommandAt
  });
}
