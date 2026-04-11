import { describe, expect, it } from "vitest";

import { persistHumanGateRoute } from "../../../../src/v11/shared/metaReviewGate/metaReviewGateShared.js";
import type { LoadedStateSnapshot } from "../../../../src/v11/shared/ports/stateSnapshots.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";

function createLoadedRunningState(): LoadedStateSnapshot {
  const state: BubbleStateSnapshot = {
    bubble_id: "b_meta_gate_human_route_01",
    state: "RUNNING",
    round: 4,
    active_agent: "codex",
    active_since: "2026-03-22T11:00:00.000Z",
    active_role: "meta_reviewer",
    execution_context: {
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      handoff_id: "meta_review:b_meta_gate_human_route_01:round:4:attempt:1",
      round: 4,
      started_at: "2026-03-22T11:00:00.000Z",
      deadline_at: "2026-03-22T11:30:00.000Z",
      attempt: 1
    },
    round_role_history: [],
    last_command_at: "2026-03-22T11:00:00.000Z",
    meta_review: {
      execution_context: {
        handoff_id: "meta_review:b_meta_gate_human_route_01:round:4:attempt:1",
        round: 4,
        awaited_output_type: "meta_review_result",
        started_at: "2026-03-22T11:00:00.000Z",
        deadline_at: "2026-03-22T11:30:00.000Z",
        attempt: 1
      },
      runtime_delivery: null,
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false
    }
  };

  return {
    fingerprint: "loaded-fingerprint",
    state
  };
}

describe("persistHumanGateRoute", () => {
  it("threads fallbackReworkTargetMessage into the staged fallback snapshot", async () => {
    const loaded = createLoadedRunningState();
    const writes: BubbleStateSnapshot[] = [];

    const result = await persistHumanGateRoute({
      appendEnvelope: async ({ envelope }) => ({
        envelope: {
          ...envelope,
          id: "env_meta_gate_human_route_01",
          ts: "2026-03-22T11:05:00.000Z"
        },
        sequence: 7,
        mirrorWriteFailures: []
      }),
      writeState: async (_statePath, state) => {
        writes.push(state);
        return {
          fingerprint: "written-fingerprint",
          state
        };
      },
      statePath: "/tmp/b_meta_gate_human_route_01/state.json",
      transcriptPath: "/tmp/b_meta_gate_human_route_01/transcript.ndjson",
      inboxPath: "/tmp/b_meta_gate_human_route_01/inbox.ndjson",
      lockPath: "/tmp/b_meta_gate_human_route_01/locks/gate.lock",
      now: new Date("2026-03-22T11:05:00.000Z"),
      nowIso: "2026-03-22T11:05:00.000Z",
      bubbleId: loaded.state.bubble_id,
      summary: "Fallback route preserved the rework target.",
      refs: [],
      loaded,
      expectedState: "RUNNING",
      route: "human_gate_budget_exhausted",
      fallbackRecommendation: "rework",
      fallbackReworkTargetMessage: "Address the remaining reviewer-parity drift."
    });

    expect(writes).toHaveLength(1);
    expect(
      writes[0]?.meta_review?.last_autonomous_rework_target_message
    ).toBe("Address the remaining reviewer-parity drift.");
    expect(result.state.meta_review?.last_autonomous_rework_target_message).toBe(
      "Address the remaining reviewer-parity drift."
    );
  });
});
