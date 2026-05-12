import type { BubbleStateSnapshot } from "../domain/state/snapshot/bubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { BubbleLifecycleState } from "../../contracts/kernel/lifecycle.js";
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

// InspectedStateSnapshot remains persisted-shape per §10.15 — the inspect
// port's coercion fallback path synthesizes diagnostic snapshots from
// partial/malformed input, which would defeat variant invariants.
export interface InspectedStateSnapshot {
  state: PersistedBubbleStateSnapshot;
  fingerprint: string;
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
