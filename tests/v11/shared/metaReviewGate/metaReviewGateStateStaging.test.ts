import { describe, expect, it } from "vitest";

import { stageMetaReviewRunningState } from "../../../../src/v11/shared/metaReviewGate/metaReviewGateStateStaging.js";
import type { LoadedStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";

function createLoadedRunningState(
  partial: Partial<BubbleStateSnapshot> = {}
): LoadedStateSnapshot {
  return {
    fingerprint: "ready-fingerprint",
    state: {
      bubble_id: "b_meta_gate_stage_01",
      state: "RUNNING",
      round: 4,
      active_agent: "claude",
      active_since: "2026-03-19T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-19T10:00:00.000Z",
      meta_review: {
        execution_context: null,
        runtime_delivery: {
          status: "uncertain",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
          message: "previous delivery not confirmed",
          observed_at: "2026-03-19T10:00:00.000Z",
          observed_for_handoff_id: "meta_review:b_meta_gate_stage_01:round:4:attempt:2",
          observed_for_round: 4
        },
        auto_rework_count: 2,
        auto_rework_limit: 5,
        sticky_human_gate: false
      },
      ...partial
    }
  };
}

describe("stageMetaReviewRunningState", () => {
  it("increments attempt from auto_rework_count when starting the next gate run", async () => {
    const calls: Array<{
      state: BubbleStateSnapshot;
      options: { expectedFingerprint?: string; expectedState?: string };
    }> = [];
    const writeState = async (
      _statePath: string,
      state: BubbleStateSnapshot,
      options: { expectedFingerprint?: string; expectedState?: string } = {}
    ): Promise<LoadedStateSnapshot> => {
      calls.push({ state, options });
      return {
        fingerprint: "next-fingerprint",
        state
      };
    };

    const result = await stageMetaReviewRunningState({
      bubbleId: "b_meta_gate_stage_01",
      loadedRunning: createLoadedRunningState(),
      metaReviewerAgent: "codex",
      nowIso: "2026-03-19T10:03:30.000Z",
      watchdogTimeoutMinutes: 15,
      statePath: "/tmp/b_meta_gate_stage_01/state.json",
      writeState
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.options).toEqual({
      expectedFingerprint: "ready-fingerprint",
      expectedState: "RUNNING"
    });
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.execution_context).toMatchObject({
      handoff_id: "meta_review:b_meta_gate_stage_01:round:4:attempt:3",
      round: 4,
      awaited_output_type: "meta_review_result",
      started_at: "2026-03-19T10:03:30.000Z",
      deadline_at: "2026-03-19T10:18:30.000Z",
      attempt: 3
    });
    expect(result.state.meta_review?.execution_context?.execution_id).toMatch(
      /^exec_[0-9a-f]{24}$/u
    );
    expect(result.state.meta_review?.auto_rework_count).toBe(2);
    expect(result.state.meta_review?.runtime_delivery).toBeNull();
    expect(result.state.meta_review).not.toHaveProperty("last_autonomous_run_id");
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
  });

  it("creates a first-run execution context from empty meta-review state defaults", async () => {
    const loadedRunning = createLoadedRunningState();
    const stateWithoutMetaReview = { ...loadedRunning.state };
    delete stateWithoutMetaReview.meta_review;

    const result = await stageMetaReviewRunningState({
      bubbleId: "b_meta_gate_stage_01",
      loadedRunning: {
        ...loadedRunning,
        state: stateWithoutMetaReview
      },
      metaReviewerAgent: "codex",
      nowIso: "2026-03-19T10:03:30.000Z",
      watchdogTimeoutMinutes: 15,
      statePath: "/tmp/b_meta_gate_stage_01/state.json",
      writeState: async (
        _statePath,
        state
      ): Promise<LoadedStateSnapshot> => ({
        fingerprint: "next-fingerprint",
        state
      })
    });

    expect(result.state.meta_review).toMatchObject({
      execution_context: {
        handoff_id: "meta_review:b_meta_gate_stage_01:round:4:attempt:1",
        round: 4,
        awaited_output_type: "meta_review_result",
        started_at: "2026-03-19T10:03:30.000Z",
        deadline_at: "2026-03-19T10:18:30.000Z",
        attempt: 1
      },
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 10,
      sticky_human_gate: false
    });
    expect(result.state.meta_review?.execution_context?.execution_id).toMatch(
      /^exec_[0-9a-f]{24}$/u
    );
  });
});
