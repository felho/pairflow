import { describe, expect, it } from "vitest";

import { SchemaValidationError } from "../../../src/core/validation.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import { createInitialBubbleState } from "../../../src/core/state/initialState.js";

describe("state machine", () => {
  it("applies valid transition and updates state", () => {
    const initial = createInitialBubbleState("b_test_01");
    const next = applyStateTransition(initial, {
      to: "PREPARING_WORKSPACE"
    });

    expect(next.state).toBe("PREPARING_WORKSPACE");
    expect(next.bubble_id).toBe("b_test_01");
  });

  it("rejects invalid transition", () => {
    const initial = createInitialBubbleState("b_test_01");
    expect(() =>
      applyStateTransition(initial, {
        to: "READY_FOR_APPROVAL"
      })
    ).toThrow(/bubble b_test_01/u);
  });

  it("enforces RUNNING active_* requirements through schema validation", () => {
    const preparing = applyStateTransition(createInitialBubbleState("b_test_01"), {
      to: "PREPARING_WORKSPACE"
    });

    try {
      applyStateTransition(preparing, {
        to: "RUNNING"
      });
      throw new Error("Expected applyStateTransition to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      if (!(error instanceof SchemaValidationError)) {
        return;
      }
      expect(error.errors.some((entry) => entry.path === "active_*")).toBe(true);
    }
  });

  it("supports round and role-history updates in one transition", () => {
    const preparing = applyStateTransition(createInitialBubbleState("b_test_01"), {
      to: "PREPARING_WORKSPACE"
    });

    const running = applyStateTransition(preparing, {
      to: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-21T12:00:00Z",
      appendRoundRoleEntry: {
        round: 1,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-02-21T12:00:00Z"
      },
      lastCommandAt: "2026-02-21T12:01:00Z"
    });

    expect(running.state).toBe("RUNNING");
    expect(running.round).toBe(1);
    expect(running.active_agent).toBe("codex");
    expect(running.round_role_history).toHaveLength(1);
    expect(running.last_command_at).toBe("2026-02-21T12:01:00Z");
  });
});
