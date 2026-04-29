import { describe, expect, it } from "vitest";

import { buildMetaReviewExecutionContext } from "../../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  buildMetaReviewRuntimeDeliveryCorrelation,
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewSnapshot,
  projectActiveMetaReviewRuntimeDelivery,
  resolveActiveMetaReviewRuntimeDelivery
} from "../../../../src/v11/shared/metaReview/metaReviewSnapshot.js";
import { validateMetaReviewSnapshot } from "../../../../src/v11/shared/state/stateSchemaMetaReview.js";
import { validateMetaReviewRuntimeDelivery } from "../../../../src/v11/shared/state/stateSchemaMetaReviewRuntime.js";
import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../../src/types/bubble.js";

describe("metaReviewSnapshot", () => {
  it("normalizes an undefined snapshot to the canonical baseline", () => {
    expect(normalizeMetaReviewSnapshot(undefined)).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
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
        sticky_human_gate: true,
        consecutive_clean_runs: 2,
      })
    ).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 2,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 2,
    });
  });

  it("normalizes a legacy snapshot with missing consecutive clean runs to zero", () => {
    expect(
      normalizeMetaReviewSnapshot({
        execution_context: null,
        runtime_delivery: null,
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      })
    ).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 1,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0
    });
  });

  it("validates explicit consecutive clean-run streak state", () => {
    const errors: { path: string; message: string }[] = [];

    expect(
      validateMetaReviewSnapshot(
        {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 2
        },
        errors
      )
    ).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 1,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 2
    });
    expect(errors).toEqual([]);
  });

  it("validates a legacy snapshot with missing consecutive clean runs as zero", () => {
    const errors: { path: string; message: string }[] = [];

    expect(
      validateMetaReviewSnapshot(
        {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: false
        },
        errors
      )
    ).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 1,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0
    });
    expect(errors).toEqual([]);
  });

  it("rejects malformed consecutive clean-run streak state", () => {
    const errors: { path: string; message: string }[] = [];

    expect(
      validateMetaReviewSnapshot(
        {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: -1
        },
        errors
      )
    ).toBeUndefined();
    expect(errors).toContainEqual({
      path: "meta_review.consecutive_clean_runs",
      message: "Must be a non-negative integer"
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

  it("normalizes producer correlation to a null/null pair when no active meta-review authority exists", () => {
    expect(buildMetaReviewRuntimeDeliveryCorrelation(null)).toEqual({
      observedForHandoffId: null,
      observedForRound: null
    });
  });

  it("builds producer correlation from the active meta-review authority", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_meta_runtime_delivery_03",
      round: 4,
      startedAt: "2026-03-08T12:40:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 2
    });

    expect(
      buildMetaReviewRuntimeDeliveryCorrelation(executionContext)
    ).toEqual({
      observedForHandoffId: executionContext.handoff_id,
      observedForRound: executionContext.round
    });
  });

  it("fails closed for partially correlated runtime delivery snapshots", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_meta_runtime_delivery_02",
      round: 3,
      startedAt: "2026-03-08T12:40:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });

    expect(
      projectActiveMetaReviewRuntimeDelivery({
        executionContext,
        runtimeDelivery: {
          status: "failed",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: executionContext.handoff_id,
          observed_for_round: null
        }
      })
    ).toBeNull();

    expect(
      projectActiveMetaReviewRuntimeDelivery({
        executionContext,
        runtimeDelivery: {
          status: "failed",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: null,
          observed_for_round: executionContext.round
        }
      })
    ).toBeNull();
  });

  it("treats undefined runtime delivery input as absent", () => {
    const errors: { path: string; message: string }[] = [];

    expect(
      validateMetaReviewRuntimeDelivery(
        undefined,
        "meta_review.runtime_delivery",
        errors
      )
    ).toBeNull();
    expect(errors).toEqual([]);
  });

  it("returns null when runtime delivery correlation validation records errors", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_meta_runtime_delivery_04",
      round: 2,
      startedAt: "2026-03-08T12:40:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    const errors: { path: string; message: string }[] = [];

    expect(
      validateMetaReviewRuntimeDelivery(
        {
          status: "failed",
          reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: executionContext.handoff_id,
          observed_for_round: null
        },
        "meta_review.runtime_delivery",
        errors
      )
    ).toBeNull();
    expect(errors).toContainEqual({
      path: "meta_review.runtime_delivery.observed_for_handoff_id",
      message:
        "Must be null when observed_for_round is null, and provided together when correlation is claimed"
    });
    expect(errors).toContainEqual({
      path: "meta_review.runtime_delivery.observed_for_round",
      message:
        "Must be null when observed_for_handoff_id is null, and provided together when correlation is claimed"
    });
  });

  it("returns null when runtime delivery reason_code validation records errors", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_meta_runtime_delivery_05",
      round: 2,
      startedAt: "2026-03-08T12:40:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    const errors: { path: string; message: string }[] = [];

    expect(
      validateMetaReviewRuntimeDelivery(
        {
          status: "failed",
          reason_code: 0,
          message: "tmux send failed",
          observed_at: "2026-03-08T12:41:00.000Z",
          observed_for_handoff_id: executionContext.handoff_id,
          observed_for_round: executionContext.round
        },
        "meta_review.runtime_delivery",
        errors
      )
    ).toBeNull();
    expect(errors).toContainEqual({
      path: "meta_review.runtime_delivery.reason_code",
      message: "Must be null or a non-empty string"
    });
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
        sticky_human_gate: false,
        consecutive_clean_runs: 0,
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
