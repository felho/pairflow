import { describe, expect, it } from "vitest";

import { persistHumanGateRoute } from "../../../../../../src/v11/application/metaReviewGate/internal/humanGate/metaReviewGateHumanGatePersistence.js";
import type { LoadedStateSnapshot } from "../../../../../../src/v11/ports/stateSnapshots.js";
import type { BubbleStateSnapshot } from "../../../../../../src/v11/domain/state/snapshot/bubbleStateSnapshotTypes.js";

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
      execution_id: "exec_meta_gate_human_route_01",
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
        execution_id: "exec_meta_gate_human_route_01",
        round: 4,
        awaited_output_type: "meta_review_result",
        started_at: "2026-03-22T11:00:00.000Z",
        deadline_at: "2026-03-22T11:30:00.000Z",
        attempt: 1
      },
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    }
  };

  return {
    fingerprint: "loaded-fingerprint",
    state
  };
}

describe("persistHumanGateRoute", () => {
  it("requires a recommendation source for human-gate persistence", async () => {
    const loaded = createLoadedRunningState();

    await expect(
      persistHumanGateRoute({
        appendEnvelope: async ({ envelope }) => ({
          envelope: {
            ...envelope,
            id: "env_meta_gate_human_route_missing_recommendation",
            ts: "2026-03-22T11:05:00.000Z"
          },
          sequence: 7,
          mirrorWriteFailures: []
        }),
        writeState: async (_statePath, state) => ({
          fingerprint: "written-fingerprint",
          state
        }),
        statePath: "/tmp/b_meta_gate_human_route_01/state.json",
        transcriptPath: "/tmp/b_meta_gate_human_route_01/transcript.ndjson",
        inboxPath: "/tmp/b_meta_gate_human_route_01/inbox.ndjson",
        lockPath: "/tmp/b_meta_gate_human_route_01/locks/gate.lock",
        now: new Date("2026-03-22T11:05:00.000Z"),
        nowIso: "2026-03-22T11:05:00.000Z",
        bubbleId: loaded.state.bubble_id,
        summary: "Missing recommendation source should fail closed.",
        refs: [],
        metaReviewerAgent: "codex",
        loaded,
        expectedState: "RUNNING",
        route: "human_gate_budget_exhausted"
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });
  });

  it("does not persist fallback-only recommendation state on the staged canonical snapshot", async () => {
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
      metaReviewerAgent: "codex",
      loaded,
      expectedState: "RUNNING",
      route: "human_gate_inconclusive",
      fallbackRecommendation: "inconclusive"
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.meta_review).toStrictEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: true,
      consecutive_clean_runs: 0,
    });
    expect(result.state.meta_review).toStrictEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: true,
      consecutive_clean_runs: 0,
    });
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "codex"
    });
  });
});
