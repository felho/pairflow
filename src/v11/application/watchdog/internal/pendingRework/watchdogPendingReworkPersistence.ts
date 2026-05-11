import { persistStateViaMutationBoundary } from "../../../../shared/mutation/mutationBoundaryIO.js";
import type { BubbleLifecycleState } from "../../../../../contracts/kernel/lifecycle.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { BubbleWatchdogError } from "../error/watchdogCommandRuntime.js";

export interface WatchdogPendingReworkWriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
}

export interface WatchdogPendingReworkLoadedStateSnapshot {
  state: PersistedBubbleStateSnapshot;
  fingerprint: string;
}

export interface PersistPendingReworkIntentStateInput {
  statePath: string;
  nextState: PersistedBubbleStateSnapshot;
  loadedState: WatchdogPendingReworkLoadedStateSnapshot;
  intentId: string;
  writeStateSnapshot: (
    statePath: string,
    state: PersistedBubbleStateSnapshot,
    options?: WatchdogPendingReworkWriteStateSnapshotOptions
  ) => Promise<WatchdogPendingReworkLoadedStateSnapshot>;
}

export async function persistPendingReworkIntentState(
  input: PersistPendingReworkIntentStateInput
): Promise<WatchdogPendingReworkLoadedStateSnapshot> {
  try {
    return await persistStateViaMutationBoundary({
      write: input.writeStateSnapshot,
      statePath: input.statePath,
      state: input.nextState,
      options: {
        expectedFingerprint: input.loadedState.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleWatchdogError(
      `Pending rework intent ${input.intentId} delivery succeeded but state update failed. Root error: ${reason}`
    );
  }
}
