import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleStateSnapshot
} from "../../types/bubble.js";

export function createInitialBubbleState(bubbleId: string): BubbleStateSnapshot {
  return {
    bubble_id: bubbleId,
    state: "CREATED",
    round: 0,
    active_agent: null,
    active_since: null,
    active_role: null,
    round_role_history: [],
    last_command_at: null,
    pending_rework_intent: null,
    rework_intent_history: [],
    meta_review: {
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false
    }
  };
}
