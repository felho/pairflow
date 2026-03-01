import { describe, expect, it } from "vitest";

import { validateBubbleStateSnapshot } from "../../../src/core/state/stateSchema.js";

describe("state schema", () => {
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
});
