import { describe, expect, it } from "vitest";

import {
  applyDeferredReworkIntent,
  deriveQueuedDeferredReworkIntentState
} from "../../../../src/v11/domain/state/rework/reworkIntentTransitions.js";

describe("v11 domain reworkIntent", () => {
  it("supersedes an existing pending deferred rework intent", () => {
    const result = deriveQueuedDeferredReworkIntentState({
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
      intentId: "intent_next",
      message: "Latest deferred rework.",
      refs: ["artifact://review.md"],
      requestedBy: "human:request-rework",
      requestedAt: "2026-03-21T10:05:00.000Z"
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
          sticky_human_gate: true,
          consecutive_clean_runs: 0,
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
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    });
    expect(result.state.pending_rework_intent).toBeNull();
    expect(result.state.round_role_history).toEqual([
      expect.objectContaining({
        round: 3,
        implementer: "codex",
        reviewer: "claude"
      })
    ]);
  });

  it("does not append duplicate next-round history when deferred rework resumes an already-staged round", () => {
    const result = applyDeferredReworkIntent({
      state: {
        bubble_id: "b_rework_intent_02",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        round_role_history: [
          {
            round: 3,
            implementer: "codex",
            reviewer: "claude",
            switched_at: "2026-03-21T10:04:00.000Z"
          }
        ],
        last_command_at: "2026-03-21T10:00:00.000Z",
        pending_rework_intent: {
          intent_id: "intent_02",
          message: "Resume without duplicating the staged round.",
          requested_by: "human:request-rework",
          requested_at: "2026-03-21T10:00:00.000Z",
          status: "pending"
        },
        rework_intent_history: []
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

    expect(result.state.round_role_history).toHaveLength(1);
    expect(result.state.round_role_history[0]).toMatchObject({
      round: 3,
      implementer: "codex",
      reviewer: "claude"
    });
  });
});
