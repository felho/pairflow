import type {
  AgentName,
  AgentRole
} from "../../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleExecutionContext
} from "../execution/executionContextTypes.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../../../shared/metaReview/metaReviewSnapshotTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../rework/reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "./roundRoleHistory.js";

interface BubbleStateCommonFields {
  bubble_id: string;
  round: number;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent?: BubbleReworkIntentRecord | null;
  rework_intent_history?: BubbleReworkIntentRecord[];
  meta_review?: BubbleMetaReviewSnapshotState;
}

export interface BubbleStateInactiveInitial extends BubbleStateCommonFields {
  kind: "inactive_initial";
  state: "CREATED" | "PREPARING_WORKSPACE";
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}

export interface BubbleStateRunningIdeation extends BubbleStateCommonFields {
  kind: "running_ideation";
  state: "RUNNING";
  round: 0;
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}

export interface BubbleStateRunningStandard extends BubbleStateCommonFields {
  kind: "running_standard";
  state: "RUNNING";
  active_agent: AgentName;
  active_role: Exclude<AgentRole, "meta_reviewer">;
  active_since: string;
  execution_context: BubbleExecutionContext;
}

export interface BubbleStateRunningMetaReview extends BubbleStateCommonFields {
  kind: "running_meta_review";
  state: "RUNNING";
  active_agent: AgentName;
  active_role: "meta_reviewer";
  active_since: string;
  execution_context: BubbleExecutionContext;
}

export interface BubbleStateWaitingHuman extends BubbleStateCommonFields {
  kind: "waiting_human";
  state: "WAITING_HUMAN";
  active_agent: AgentName;
  active_role: AgentRole;
  active_since: string;
  execution_context: null;
}

export interface BubbleStateReadyForApproval extends BubbleStateCommonFields {
  kind: "ready_for_approval";
  state: "READY_FOR_HUMAN_APPROVAL";
  active_agent: AgentName;
  active_role: AgentRole;
  active_since: string;
  execution_context: null;
}

export interface BubbleStateTerminalClean extends BubbleStateCommonFields {
  kind: "terminal_clean";
  state: "APPROVED_FOR_COMMIT" | "COMMITTED" | "DONE";
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}

export interface BubbleStateTerminalFailed extends BubbleStateCommonFields {
  kind: "terminal_failed";
  state: "FAILED" | "CANCELLED";
  active_agent: null;
  active_role: null;
  active_since: null;
  execution_context: null;
}

export type BubbleStateSnapshot =
  | BubbleStateInactiveInitial
  | BubbleStateRunningIdeation
  | BubbleStateRunningStandard
  | BubbleStateRunningMetaReview
  | BubbleStateWaitingHuman
  | BubbleStateReadyForApproval
  | BubbleStateTerminalClean
  | BubbleStateTerminalFailed;

export type BubbleStateSnapshotKind = BubbleStateSnapshot["kind"];
