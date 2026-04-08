import type {
  BubbleLifecycleState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ValidationError } from "../validation/primitives.js";

export interface StateValidationDiagnostics {
  message: string;
  errors: ValidationError[];
}

export interface LoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
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
