import type { PersistedBubbleStateSnapshot } from "../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { BubbleLifecycleState } from "../../contracts/kernel/lifecycle.js";
import type {
  StateValidationDiagnostics
} from "../../contracts/ui/stateValidation.js";
export type {
  StateValidationDiagnostics
} from "../../contracts/ui/stateValidation.js";

export interface LoadedStateSnapshot {
  state: PersistedBubbleStateSnapshot;
  fingerprint: string;
}

export interface InspectedStateSnapshot extends LoadedStateSnapshot {
  stateValidation: StateValidationDiagnostics | null;
}

export type ReadStateSnapshotPort = (
  statePath: string
) => Promise<LoadedStateSnapshot>;

export interface WriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
  lockTimeoutMs?: number;
}

export type WriteStateSnapshotPort = (
  statePath: string,
  state: PersistedBubbleStateSnapshot,
  options?: WriteStateSnapshotOptions
) => Promise<LoadedStateSnapshot>;
