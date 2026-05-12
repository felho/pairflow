import type {
  AgentName,
  AgentRole
} from "../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../domain/state/snapshot/bubbleStateSnapshot.js";
import type { BubbleLifecycleState } from "../../contracts/kernel/lifecycle.js";
import type {
  BubbleExecutionContext
} from "../domain/state/execution/executionContext.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../shared/metaReview/metaReviewSnapshotTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../domain/state/rework/reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "../domain/state/snapshot/roundRoleHistory.js";
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

// Diagnostic read-model shape: it intentionally uses the persisted wire fields
// without claiming the snapshot passed domain-variant validation.
export interface InspectableStateProjection {
  bubble_id: string;
  state: BubbleLifecycleState;
  round: number;
  active_agent: AgentName | null;
  active_since: string | null;
  active_role: AgentRole | null;
  execution_context?: BubbleExecutionContext | null;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent?: BubbleReworkIntentRecord | null;
  rework_intent_history?: BubbleReworkIntentRecord[];
  meta_review?: BubbleMetaReviewSnapshotState;
}

// Inspect reads always expose a uniform diagnostic projection for list/status
// screens. When canonical parsing succeeds, validatedSnapshot carries the
// strict domain variant; diagnostic salvage keeps it null.
export interface InspectedStateSnapshot {
  state: InspectableStateProjection;
  validatedSnapshot: BubbleStateSnapshot | null;
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
