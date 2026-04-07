import type { BubbleLifecycleState, BubbleStateSnapshot } from "../../../types/bubble.js";
import { BubbleWatchdogError } from "./watchdogCommandError.js";

export interface WatchdogPendingReworkWriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
}

export interface WatchdogPendingReworkLoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface PersistPendingReworkIntentStateInput {
  statePath: string;
  nextState: BubbleStateSnapshot;
  loadedState: WatchdogPendingReworkLoadedStateSnapshot;
  intentId: string;
  writeStateSnapshot: (
    statePath: string,
    state: BubbleStateSnapshot,
    options?: WatchdogPendingReworkWriteStateSnapshotOptions
  ) => Promise<WatchdogPendingReworkLoadedStateSnapshot>;
}

export async function persistPendingReworkIntentState(
  input: PersistPendingReworkIntentStateInput
): Promise<WatchdogPendingReworkLoadedStateSnapshot> {
  try {
    return await input.writeStateSnapshot(
      input.statePath,
      input.nextState,
      {
        expectedFingerprint: input.loadedState.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleWatchdogError(
      `Pending rework intent ${input.intentId} delivery succeeded but state update failed. Root error: ${reason}`
    );
  }
}
