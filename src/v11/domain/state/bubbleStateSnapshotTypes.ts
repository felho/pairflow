import type {
  AgentName,
  AgentRole
} from "../../../contracts/kernel/agentIdentity.js";
import type { BubbleLifecycleState } from "../../../contracts/kernel/lifecycle.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import type {
  BubbleExecutionContext
} from "./executionContextTypes.js";
import type {
  BubbleReworkIntentRecord
} from "./reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "./roundRoleHistoryTypes.js";

export interface BubbleStateSnapshot {
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
