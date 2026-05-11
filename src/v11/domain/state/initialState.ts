import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import type { BubbleStateSnapshot } from "../../domain/state/bubbleStateSnapshotTypes.js";

export function createInitialBubbleState(bubbleId: string): BubbleStateSnapshot {
  return {
    bubble_id: bubbleId,
    state: "CREATED",
    round: 0,
    active_agent: null,
    active_since: null,
    active_role: null,
    execution_context: null,
    round_role_history: [],
    last_command_at: null,
    pending_rework_intent: null,
    rework_intent_history: [],
    meta_review: {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false,
      consecutive_clean_runs: 0
    }
  };
}
