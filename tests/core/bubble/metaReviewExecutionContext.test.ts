import { describe, expect, it } from "vitest";

import {
  buildMetaReviewExecutionContext,
  validateActiveMetaReviewExecutionContext
} from "../../../src/core/bubble/metaReviewExecutionContext.js";
import { metaReviewExecutionContextToRunningContext } from "../../../src/core/state/executionContext.js";
import type { BubbleStateSnapshot } from "../../../src/types/bubble.js";

function createMetaReviewRunningState(
  partial: Partial<BubbleStateSnapshot> = {}
): BubbleStateSnapshot {
  return {
    bubble_id: "b_meta_execctx_test_01",
    state: "RUNNING",
    round: 2,
    active_agent: "codex",
    active_since: "2026-03-08T10:00:00.000Z",
    active_role: "meta_reviewer",
    execution_context: metaReviewExecutionContextToRunningContext(
      buildMetaReviewExecutionContext({
        bubbleId: "b_meta_execctx_test_01",
        round: 2,
        startedAt: "2026-03-08T10:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        attempt: 1
      })
    ),
    round_role_history: [],
    last_command_at: "2026-03-08T10:00:00.000Z",
    meta_review: {
      execution_context: buildMetaReviewExecutionContext({
        bubbleId: "b_meta_execctx_test_01",
        round: 2,
        startedAt: "2026-03-08T10:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        attempt: 1
      }),
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
    },
    ...partial
  };
}

describe("validateActiveMetaReviewExecutionContext", () => {
  it("builds canonical execution context from valid inputs", () => {
    expect(
      buildMetaReviewExecutionContext({
        bubbleId: "b_meta_execctx_test_01",
        round: 2,
        startedAt: "2026-03-08T10:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        attempt: 1
      })
    ).toEqual({
      handoff_id: "meta_review:b_meta_execctx_test_01:round:2:attempt:1",
      round: 2,
      awaited_output_type: "meta_review_result",
      started_at: "2026-03-08T10:00:00.000Z",
      deadline_at: "2026-03-08T10:30:00.000Z",
      attempt: 1
    });
  });

  it("rejects invalid builder inputs before constructing a broken deadline", () => {
    expect(() =>
      buildMetaReviewExecutionContext({
        bubbleId: "b_meta_execctx_test_01",
        round: 2,
        startedAt: "not-a-timestamp",
        watchdogTimeoutMinutes: 30,
        attempt: 1
      })
    ).toThrowError(
      "meta-review execution context requires a valid startedAt timestamp: not-a-timestamp"
    );

    expect(() =>
      buildMetaReviewExecutionContext({
        bubbleId: "b_meta_execctx_test_01",
        round: 2,
        startedAt: "2026-03-08T10:00:00.000Z",
        watchdogTimeoutMinutes: Number.NaN,
        attempt: 1
      })
    ).toThrowError(
      "meta-review execution context requires a positive finite watchdog timeout: NaN"
    );
  });

  it("accepts canonical RUNNING meta-review authority execution context", () => {
    const state = createMetaReviewRunningState();
    const result = validateActiveMetaReviewExecutionContext(state);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual(state.execution_context);
  });

  it("rejects non-meta-review lifecycle states before inspecting context", () => {
    const result = validateActiveMetaReviewExecutionContext(
      createMetaReviewRunningState({ state: "WAITING_HUMAN" })
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toEqual([
      {
        path: "state",
        message:
          "Expected RUNNING state with active meta-review authority, received WAITING_HUMAN."
      }
    ]);
  });

  it("rejects missing execution context for RUNNING meta-review authority", () => {
    const result = validateActiveMetaReviewExecutionContext(
      createMetaReviewRunningState({
        execution_context: null,
        meta_review: {
          ...createMetaReviewRunningState().meta_review!,
          execution_context: null
        }
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toEqual([
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority."
      }
    ]);
  });

  it("rejects malformed authority fields and round drift", () => {
    const result = validateActiveMetaReviewExecutionContext(
      createMetaReviewRunningState({
        execution_context: {
          ...createMetaReviewRunningState().execution_context!,
          handoff_id: "",
          round: 3,
          awaited_output_type:
            "review_result" as unknown as "meta_review_result",
          attempt: 0,
          deadline_at: "2026-03-08T09:59:59.000Z"
        },
        meta_review: {
          ...createMetaReviewRunningState().meta_review!,
          execution_context: {
            handoff_id: "",
            round: 3,
            awaited_output_type:
              "review_result" as unknown as "meta_review_result",
            started_at: "2026-03-08T10:00:00.000Z",
            deadline_at: "2026-03-08T09:59:59.000Z",
            attempt: 0
          }
        }
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toEqual([
      {
        path: "execution_context.handoff_id",
        message: "Must be a non-empty string"
      },
      {
        path: "execution_context.round",
        message: "Must match state.round (2) while meta-review authority is active"
      },
      {
        path: "execution_context.awaited_output_type",
        message: "Must be meta_review_result"
      },
      {
        path: "execution_context.attempt",
        message: "Must be an integer >= 1"
      },
      {
        path: "execution_context.deadline_at",
        message: "Must be >= started_at"
      }
    ]);
  });
});
