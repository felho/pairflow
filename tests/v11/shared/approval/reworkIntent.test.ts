import { describe, expect, it } from "vitest";

import {
  applyDeferredReworkIntent,
  queueDeferredReworkIntent
} from "../../../../src/v11/shared/approval/reworkIntent.js";

describe("v11 approval reworkIntent", () => {
  it("supersedes an existing pending deferred rework intent", () => {
    const result = queueDeferredReworkIntent({
      state: {
        bubble_id: "b_rework_queue_01",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        round_role_history: [],
        last_command_at: "2026-03-21T10:00:00.000Z",
        pending_rework_intent: {
          intent_id: "intent_prev",
          message: "Previous deferred rework.",
          requested_by: "human:request-rework",
          requested_at: "2026-03-21T10:00:00.000Z",
          status: "pending"
        },
        rework_intent_history: []
      },
      message: "Latest deferred rework.",
      refs: ["artifact://review.md"],
      requestedBy: "human:request-rework",
      now: new Date("2026-03-21T10:05:00.000Z")
    });

    expect(result.supersededIntentId).toBe("intent_prev");
    expect(result.intent.status).toBe("pending");
    expect(result.state.pending_rework_intent?.intent_id).toBe(result.intent.intent_id);
    expect(result.state.pending_rework_intent?.refs).toEqual([
      "artifact://review.md"
    ]);
    expect(result.state.rework_intent_history).toEqual([
      expect.objectContaining({
        intent_id: "intent_prev",
        status: "superseded",
        superseded_by_intent_id: result.intent.intent_id
      })
    ]);
  });

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
          auto_rework_count: 2,
          auto_rework_limit: 5,
          sticky_human_gate: true
        }
      },
      implementer: "codex",
      reviewer: "claude",
      watchdogTimeoutMinutes: 60,
      now: new Date("2026-03-21T10:05:00.000Z")
    });

    expect(result).not.toBeNull();
    if (result === null) {
      throw new Error("Expected deferred rework intent to be applied.");
    }

    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(3);
    expect(result.state.meta_review).toMatchObject({
      auto_rework_count: 2,
      auto_rework_limit: 5,
      sticky_human_gate: false
    });
    expect(result.state.pending_rework_intent).toBeNull();
  });
});
