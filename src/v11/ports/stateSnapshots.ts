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

// Variant-aware port siblings — Step 4b-β opt-in API. Consumers that
// have migrated to the domain variant model use these; others continue
// using the persisted-shape ports above. Step 4b-γ collapses the two
// families into a single canonical variant-shaped API.

export interface LoadedDomainStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export type ReadDomainStateSnapshotPort = (
  statePath: string
) => Promise<LoadedDomainStateSnapshot>;

export type WriteDomainStateSnapshotPort = (
  statePath: string,
  state: BubbleStateSnapshot,
  options?: WriteStateSnapshotOptions
) => Promise<LoadedDomainStateSnapshot>;
