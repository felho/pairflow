import { describe, expect, it } from "vitest";

import { createInitialBubbleState } from "../../../src/core/state/initialState.js";
import { validateBubbleStateSnapshot } from "../../../src/core/state/stateSchema.js";

describe("state schema", () => {
  it("initial state contains deterministic meta-review defaults", () => {
    const state = createInitialBubbleState("b_test_init_meta_01");

    expect(state.meta_review).toEqual({
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

  it("accepts RUNNING state with active turn tracking", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_01",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-02-21T12:00:00.000Z",
      active_role: "implementer",
      round_role_history: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-21T11:00:00.000Z"
        }
      ],
      last_command_at: "2026-02-21T12:05:00.000Z"
    });

    expect(result.ok).toBe(true);
  });

  it("rejects RUNNING state when active fields are missing", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_01",
      state: "RUNNING",
      round: 1,
      active_agent: null,
      active_since: null,
      active_role: null,
      round_role_history: [],
      last_command_at: null
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "active_*")).toBe(true);
  });

  it("rejects partially populated active fields", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_01",
      state: "WAITING_HUMAN",
      round: 1,
      active_agent: "codex",
      active_since: null,
      active_role: null,
      round_role_history: [],
      last_command_at: null
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "active_*")).toBe(true);
  });

  it("rejects invalid round_role_history entries", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_01",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-02-21T12:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "codex",
          switched_at: "bad-ts"
        }
      ],
      last_command_at: "2026-02-21T12:05:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) =>
        error.path.includes("round_role_history[0]")
      )
    ).toBe(true);
  });

  it("accepts rework intent pending slot + immutable history records", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_02",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-02-21T12:00:00.000Z",
      active_role: "implementer",
      round_role_history: [],
      last_command_at: "2026-02-21T12:05:00.000Z",
      pending_rework_intent: {
        intent_id: "intent_123",
        message: "Queue rework",
        requested_by: "human:request-rework",
        requested_at: "2026-02-21T12:05:00.000Z",
        status: "pending"
      },
      rework_intent_history: [
        {
          intent_id: "intent_100",
          message: "Old intent",
          requested_by: "human:request-rework",
          requested_at: "2026-02-21T11:59:00.000Z",
          status: "superseded",
          superseded_by_intent_id: "intent_123"
        }
      ]
    });

    expect(result.ok).toBe(true);
  });

  it("defaults missing rework-intent fields to empty state", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_03",
      state: "CREATED",
      round: 0,
      active_agent: null,
      active_since: null,
      active_role: null,
      round_role_history: [],
      last_command_at: null
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.pending_rework_intent).toBeNull();
    expect(result.value.rework_intent_history).toEqual([]);
    expect(result.value.meta_review).toBeUndefined();
  });

  it("rejects invalid pending_rework_intent status", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_04",
      state: "WAITING_HUMAN",
      round: 1,
      active_agent: "codex",
      active_since: "2026-02-21T12:00:00.000Z",
      active_role: "implementer",
      round_role_history: [],
      last_command_at: "2026-02-21T12:05:00.000Z",
      pending_rework_intent: {
        intent_id: "intent_bad",
        message: "Bad pending status",
        requested_by: "human:request-rework",
        requested_at: "2026-02-21T12:05:00.000Z",
        status: "applied"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "pending_rework_intent.status"
      )
    ).toBe(true);
  });

  it("accepts valid meta-review snapshot", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_01",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_01",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Needs fixes",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "Fix unstable validation logic",
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(true);
  });

  it("rejects invalid meta-review snapshot values with field-level paths", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_02",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: null,
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "",
        last_autonomous_updated_at: "bad-ts",
        auto_rework_count: -1,
        auto_rework_limit: 0,
        sticky_human_gate: "nope"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "meta_review.last_autonomous_rework_target_message"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.auto_rework_count"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_updated_at"
      )
    ).toBe(true);
  });

  it("rejects invalid meta-review status/recommendation combinations", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_03",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_03",
        last_autonomous_status: "error",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Mismatch",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_recommendation"
      )
    ).toBe(true);
  });

  it("rejects status=inconclusive when recommendation is not inconclusive", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_03b",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_03b",
        last_autonomous_status: "inconclusive",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Mismatch",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_recommendation"
      )
    ).toBe(true);
  });

  it("emits a single deterministic error for empty rework target message", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_03c",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_03c",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Needs action",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "",
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    const reworkMessageErrors = result.errors.filter(
      (error) =>
        error.path === "meta_review.last_autonomous_rework_target_message"
    );
    expect(reworkMessageErrors).toHaveLength(1);
    expect(reworkMessageErrors[0]?.message).toContain("recommendation is rework");
  });

  it("retains type-validation error for non-string rework target message", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_03c_type",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_03c_type",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "rework",
        last_autonomous_summary: "Needs action",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: { message: "bad" },
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    const reworkMessageErrors = result.errors.filter(
      (error) =>
        error.path === "meta_review.last_autonomous_rework_target_message"
    );
    expect(reworkMessageErrors).toHaveLength(1);
    expect(reworkMessageErrors[0]?.message).toContain(
      "Must be null or a non-empty string"
    );
  });

  it("rejects unsafe meta-review report_ref values", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_03d",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_03d",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Looks fine",
        last_autonomous_report_ref: "../outside.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_report_ref"
      )
    ).toBe(true);
  });

  it("rejects meta-review report_ref values with null byte", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_03e",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_03e",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Looks fine",
        last_autonomous_report_ref: "artifacts/meta-review-last.md\u0000tmp",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_report_ref"
      )
    ).toBe(true);
  });

  it("rejects no-run snapshots when run-specific fields are populated", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_04",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_04",
        last_autonomous_status: null,
        last_autonomous_recommendation: null,
        last_autonomous_summary: "unexpected summary",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "advisory",
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_run_id"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_report_ref"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_summary"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) =>
          error.path === "meta_review.last_autonomous_rework_target_message"
      )
    ).toBe(true);
  });

  it("rejects run snapshots without run_id when status/recommendation are set", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_05",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: null,
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Approved",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_run_id"
      )
    ).toBe(true);
  });

  it("rejects run snapshots without report_ref when status/recommendation are set", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_05b",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_05b",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Approved",
        last_autonomous_report_ref: null,
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_report_ref"
      )
    ).toBe(true);
  });

  it("emits mismatch-only co-occurrence error for partially-null status/recommendation", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_05c",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: null,
        last_autonomous_status: null,
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: null,
        last_autonomous_report_ref: null,
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: null,
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "meta_review" &&
          error.message.includes("must both be null or both be set")
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_run_id"
      )
    ).toBe(false);
    expect(
      result.errors.some(
        (error) => error.path === "meta_review.last_autonomous_updated_at"
      )
    ).toBe(false);
  });

  it("does not emit co-occurrence errors when enum values are individually invalid", () => {
    const result = validateBubbleStateSnapshot({
      bubble_id: "b_test_meta_06",
      state: "WAITING_HUMAN",
      round: 2,
      active_agent: "codex",
      active_since: "2026-03-08T10:00:00.000Z",
      active_role: "reviewer",
      round_role_history: [],
      last_command_at: "2026-03-08T10:01:00.000Z",
      meta_review: {
        last_autonomous_run_id: "run_meta_04",
        last_autonomous_status: "error",
        last_autonomous_recommendation: "invalid-recommendation",
        last_autonomous_summary: "Enum invalid",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: null,
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "meta_review.last_autonomous_recommendation" &&
          error.message === "Must be null or one of: rework, approve, inconclusive"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.message.includes("Must be inconclusive when")
      )
    ).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes("must both be null or both be set")
      )
    ).toBe(false);
  });
});
