import { describe, expect, it } from "vitest";

import { buildMetaReviewExecutionContext } from "../../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../../src/v11/shared/state/executionContext.js";
import { createInitialBubbleState } from "../../../../src/v11/domain/state/initialState.js";
import { validateBubbleStateSnapshot } from "../../../../src/v11/shared/state/stateSchema.js";

describe("v11 shared state schema", () => {
  it("keeps deterministic initial meta-review defaults under the v11 owner", () => {
    const state = createInitialBubbleState("b_v11_state_schema_01");

    expect(state.meta_review).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false
    });
  });

  it("accepts running state with canonical execution context from the v11 shared boundary", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_v11_state_schema_02",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-04-06T10:00:00.000Z",
      active_role: "implementer",
      execution_context: buildRunningExecutionContext({
        bubbleId: "b_v11_state_schema_02",
        round: 2,
        activeRole: "implementer",
        startedAt: "2026-04-06T10:00:00.000Z",
        watchdogTimeoutMinutes: 30
      }),
      round_role_history: [],
      last_command_at: "2026-04-06T10:01:00.000Z"
    });

    expect(result.ok).toBe(true);
  });

  it("accepts meta-review authority snapshots through the v11 shared schema", () => {
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: "b_v11_state_schema_03",
      round: 2,
      startedAt: "2026-04-06T10:00:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });

    const result = validateBubbleStateSnapshot({
      bubble_id: "b_v11_state_schema_03",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-04-06T10:00:00.000Z",
      active_role: "meta_reviewer",
      execution_context: metaReviewExecutionContextToRunningContext(executionContext),
      round_role_history: [],
      last_command_at: "2026-04-06T10:01:00.000Z",
      meta_review: {
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: "b_v11_state_schema_03",
          round: 2,
          startedAt: "2026-04-06T10:00:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        }),
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(true);
  });

  it("rejects pre-E1 execution authority snapshots without execution_id under the v11 shared schema", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_v11_state_schema_04",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-04-06T10:00:00.000Z",
      active_role: "implementer",
      execution_context: {
        active_role: "implementer",
        awaited_output_type: "pass_result",
        handoff_id: "implementer:b_v11_state_schema_04:round:2:attempt:1",
        round: 2,
        started_at: "2026-04-06T10:00:00.000Z",
        deadline_at: "2026-04-06T10:30:00.000Z",
        attempt: 1
      },
      round_role_history: [],
      last_command_at: "2026-04-06T10:01:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toContainEqual({
      path: "execution_context.execution_id",
      message:
        "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: pre-E1 execution_context snapshots without execution_id are unsupported"
    });
  });
});
