import { describe, expect, it } from "vitest";

import { buildMetaReviewExecutionContext } from "../../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewSnapshot,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../../../src/v11/shared/metaReview/metaReviewSnapshot.js";
import { validateMetaReviewSnapshot } from "../../../../src/v11/shared/state/stateSchemaMetaReview.js";
import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../../src/types/bubble.js";

describe("metaReviewSnapshot", () => {
  it("normalizes an undefined snapshot to the canonical baseline", () => {
    expect(normalizeMetaReviewSnapshot(undefined)).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false
    });
  });

  it("clears active runtime ownership while preserving rework counters", () => {
    expect(
      clearLiveMetaReviewSnapshot({
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: "b_meta_snapshot_01",
          round: 2,
          startedAt: "2026-03-08T12:40:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        }),
        runtime_delivery: {
          status: "confirmed",
          reason_code: null,
          message: "confirmed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id:
            "meta_review:b_meta_snapshot_01:round:2:attempt:1",
          observed_for_round: 2
        },
        auto_rework_count: 2,
        auto_rework_limit: 5,
        sticky_human_gate: true
      })
    ).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 2,
      auto_rework_limit: 5,
      sticky_human_gate: false
    });
  });

  it("returns runtime delivery only when it matches the active handoff and round", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_meta_runtime_delivery_01",
      round: 3,
      startedAt: "2026-03-08T12:40:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });

    expect(
      resolveActiveMetaReviewRuntimeDelivery({
        executionContext,
        runtimeDelivery: {
          status: "uncertain",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
          message: "pane delivery not confirmed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: executionContext.handoff_id,
          observed_for_round: executionContext.round
        }
      })
    ).toEqual({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "pane delivery not confirmed",
      observed_at: "2026-03-08T12:41:00.000Z",
      observed_for_handoff_id: executionContext.handoff_id,
      observed_for_round: executionContext.round
    });

    expect(
      resolveActiveMetaReviewRuntimeDelivery({
        executionContext,
        runtimeDelivery: {
          status: "failed",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: executionContext.handoff_id,
          observed_for_round: executionContext.round + 1
        }
      })
    ).toBeNull();

    expect(
      resolveActiveMetaReviewRuntimeDelivery({
        executionContext,
        runtimeDelivery: {
          status: "failed",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: null,
          observed_for_round: null
        }
      })
    ).toBeNull();
  });

  it("rejects pre-E1 nested execution_context snapshots without execution_id", () => {
    const errors: { path: string; message: string }[] = [];
    const result = validateMetaReviewSnapshot(
      {
        execution_context: {
          handoff_id: "meta_review:b_meta_snapshot_02:round:2:attempt:1",
          round: 2,
          awaited_output_type: "meta_review_result",
          started_at: "2026-03-08T12:40:00.000Z",
          deadline_at: "2026-03-08T13:40:00.000Z",
          attempt: 1
        },
        runtime_delivery: null,
        auto_rework_count: 0,
        auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
        sticky_human_gate: false
      },
      errors
    );

    expect(result).toBeUndefined();
    expect(errors).toContainEqual({
      path: "meta_review.execution_context.execution_id",
      message:
        "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: pre-E1 meta_review.execution_context snapshots without execution_id are unsupported"
    });
  });
});
