import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../domain/state/snapshot/projection.js";
import { applyStateTransition } from "./machine.js";

export interface DeriveWatchdogWaitingHumanStateInput {
  state: BubbleStateSnapshot;
  lastCommandAt: string;
}

export function deriveWatchdogWaitingHumanState(
  input: DeriveWatchdogWaitingHumanStateInput
): BubbleStateSnapshot {
  const nextPersisted = applyStateTransition(toPersistedSnapshot(input.state), {
    to: "WAITING_HUMAN",
    lastCommandAt: input.lastCommandAt
  });
  return buildBubbleStateSnapshotVariant(nextPersisted);
}
