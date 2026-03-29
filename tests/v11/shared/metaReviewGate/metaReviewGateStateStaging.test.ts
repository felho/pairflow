import { describe, expect, it } from "vitest";

import { stageMetaReviewRunningState } from "../../../../src/v11/shared/metaReviewGate/metaReviewGateStateStaging.js";
import type { LoadedStateSnapshot } from "../../../../src/core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";

function createReadyForApprovalState(
  partial: Partial<BubbleStateSnapshot> = {}
): LoadedStateSnapshot {
  return {
    fingerprint: "ready-fingerprint",
    state: {
      bubble_id: "b_meta_gate_stage_01",
      state: "READY_FOR_APPROVAL",
      round: 4,
      active_agent: null,
      active_since: null,
      active_role: null,
      round_role_history: [],
      last_command_at: "2026-03-19T10:00:00.000Z",
      meta_review: {
        execution_context: null,
        last_autonomous_run_id: "run_prev",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Need another pass",
        last_autonomous_report_ref: "artifacts/meta-review-last.json",
        last_autonomous_rework_target_message: "Address open findings",
        last_autonomous_updated_at: "2026-03-19T10:00:00.000Z",
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
      readyForApproval: createReadyForApprovalState(),
      nowIso: "2026-03-19T10:03:30.000Z",
      watchdogTimeoutMinutes: 15,
      statePath: "/tmp/b_meta_gate_stage_01/state.json",
      writeState
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.options).toEqual({
      expectedFingerprint: "ready-fingerprint",
      expectedState: "READY_FOR_APPROVAL"
    });
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.meta_review?.execution_context).toEqual({
      handoff_id: "meta_review:b_meta_gate_stage_01:round:4:attempt:3",
      round: 4,
      awaited_output_type: "meta_review_result",
      started_at: "2026-03-19T10:03:30.000Z",
      deadline_at: "2026-03-19T10:18:30.000Z",
      attempt: 3
    });
    expect(result.state.meta_review?.auto_rework_count).toBe(2);
    expect(result.state.meta_review?.last_autonomous_run_id).toBeNull();
    expect(result.state.meta_review?.last_autonomous_status).toBeNull();
    expect(result.state.meta_review?.last_autonomous_recommendation).toBeNull();
    expect(result.state.meta_review?.last_autonomous_summary).toBeNull();
    expect(result.state.meta_review?.last_autonomous_report_ref).toBeNull();
    expect(result.state.meta_review?.last_autonomous_rework_target_message).toBeNull();
    expect(result.state.meta_review?.last_autonomous_updated_at).toBeNull();
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
  });

  it("creates a first-run execution context from empty meta-review state defaults", async () => {
    const readyForApproval = createReadyForApprovalState();
    const stateWithoutMetaReview = { ...readyForApproval.state };
    delete stateWithoutMetaReview.meta_review;

    const result = await stageMetaReviewRunningState({
      bubbleId: "b_meta_gate_stage_01",
      readyForApproval: {
        ...readyForApproval,
        state: stateWithoutMetaReview
      },
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

    expect(result.state.meta_review).toEqual({
      execution_context: {
        handoff_id: "meta_review:b_meta_gate_stage_01:round:4:attempt:1",
        round: 4,
        awaited_output_type: "meta_review_result",
        started_at: "2026-03-19T10:03:30.000Z",
        deadline_at: "2026-03-19T10:18:30.000Z",
        attempt: 1
      },
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
    });
  });
});
