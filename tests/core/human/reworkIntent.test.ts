import { describe, expect, it } from "vitest";

import { applyDeferredReworkIntent } from "../../../src/core/human/reworkIntent.js";

describe("applyDeferredReworkIntent", () => {
  it("clears live meta-review authority when deferred rework resumes the next round", () => {
    const result = applyDeferredReworkIntent({
      state: {
        bubble_id: "b_rework_intent_01",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        round_role_history: [],
        last_command_at: "2026-03-21T10:00:00.000Z",
        pending_rework_intent: {
          intent_id: "intent_01",
          message: "Resume with a stricter next round.",
          requested_by: "human:request-rework",
          requested_at: "2026-03-21T10:00:00.000Z",
          status: "pending"
        },
        rework_intent_history: [],
        meta_review: {
          last_autonomous_run_id: "run_prev_round",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Previous round approve.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-21T09:59:00.000Z",
          auto_rework_count: 2,
          auto_rework_limit: 5,
          sticky_human_gate: true
        }
      },
      implementer: "codex",
      reviewer: "claude",
      now: new Date("2026-03-21T10:05:00.000Z")
    });

    expect(result).not.toBeNull();
    if (result === null) {
      throw new Error("Expected deferred rework intent to be applied.");
    }

    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(3);
    expect(result.state.meta_review).toMatchObject({
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 2,
      auto_rework_limit: 5,
      sticky_human_gate: false
    });
    expect(result.state.pending_rework_intent).toBeNull();
  });
});
