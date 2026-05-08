import type {
  AgentName,
  AgentRole
} from "../v11/domain/agentIdentity/agentIdentity.js";
import type {
  BubbleExecutionContext
} from "../v11/shared/state/executionContextTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../v11/shared/state/reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "../v11/shared/state/roundRoleHistoryTypes.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../v11/shared/metaReview/metaReviewSnapshotTypes.js";
import type { BubbleLifecycleState } from "../v11/domain/state/lifecycleTypes.js";

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
