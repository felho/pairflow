import { describe, expect, it } from "vitest";

import { applyDeferredReworkIntent } from "../../../src/v11/domain/state/rework/reworkIntentTransitions.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";

describe("applyDeferredReworkIntent", () => {
  it("clears live meta-review authority when deferred rework resumes the next round", () => {
    const result = applyDeferredReworkIntent({
      state: buildBubbleStateSnapshotVariant({
        bubble_id: "b_rework_intent_01",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-21T09:55:00.000Z",
        active_role: "implementer",
        execution_context: null,
        round_role_history: [
          {
            round: 2,
            implementer: "codex",
            reviewer: "claude",
            switched_at: "2026-03-21T09:55:00.000Z"
          }
        ],
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
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 2,
          auto_rework_limit: 5,
          sticky_human_gate: true,
          consecutive_clean_runs: 0,
        }
      }),
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
  });
});
