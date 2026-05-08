import type {
  BubbleStateSnapshot
} from "../../types/bubble.js";
import type {
  BubbleLifecycleState
} from "../../contracts/ui/bubbleLifecycle.js";
import type {
  StateValidationDiagnostics
} from "../../contracts/ui/stateValidation.js";
export type {
  StateValidationDiagnostics
} from "../../contracts/ui/stateValidation.js";

export interface LoadedStateSnapshot {
  state: BubbleStateSnapshot;
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
  state: BubbleStateSnapshot,
  options?: WriteStateSnapshotOptions
) => Promise<LoadedStateSnapshot>;
