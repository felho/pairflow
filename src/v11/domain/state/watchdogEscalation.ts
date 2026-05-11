import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { applyStateTransition } from "./machine.js";

export interface DeriveWatchdogWaitingHumanStateInput {
  state: PersistedBubbleStateSnapshot;
  lastCommandAt: string;
}

export function deriveWatchdogWaitingHumanState(
  input: DeriveWatchdogWaitingHumanStateInput
): PersistedBubbleStateSnapshot {
  return applyStateTransition(input.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.lastCommandAt
  });
}
