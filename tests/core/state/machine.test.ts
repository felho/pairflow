import { describe, expect, it } from "vitest";

import { buildRunningExecutionContext } from "../../../src/v11/domain/state/execution/executionContext.js";
import { SchemaValidationError } from "../../../src/v11/shared/validation/primitives.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { createInitialBubbleState } from "../../../src/v11/domain/state/initialState.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";

function createInitialVariant(bubbleId: string) {
  return buildBubbleStateSnapshotVariant(createInitialBubbleState(bubbleId));
}

describe("state machine", () => {
  it("applies valid transition and updates state", () => {
    const initial = createInitialVariant("b_test_01");
    const next = applyStateTransition(initial, {
      to: "PREPARING_WORKSPACE"
    });

    expect(next.state).toBe("PREPARING_WORKSPACE");
    expect(next.bubble_id).toBe("b_test_01");
  });

  it("rejects invalid transition", () => {
    const initial = createInitialVariant("b_test_01");
    expect(() =>
      applyStateTransition(initial, {
        to: "READY_FOR_HUMAN_APPROVAL"
      })
    ).toThrow(/bubble b_test_01/u);
  });

  it("enforces RUNNING active_* requirements through schema validation", () => {
    const preparing = applyStateTransition(createInitialVariant("b_test_01"), {
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
    const preparing = applyStateTransition(createInitialVariant("b_test_01"), {
      to: "PREPARING_WORKSPACE"
    });

    const running = applyStateTransition(preparing, {
      to: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      executionContext: buildRunningExecutionContext({
        bubbleId: "b_test_01",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-02-21T12:00:00Z",
        watchdogTimeoutMinutes: 30
      }),
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
    expect(running.execution_context?.handoff_id).toBe(
      "implementer:b_test_01:round:1:attempt:1"
    );
    expect(running.round_role_history).toHaveLength(1);
    expect(running.last_command_at).toBe("2026-02-21T12:01:00Z");
  });

  it("preserves active ownership when transition fields are omitted", () => {
    const preparing = applyStateTransition(createInitialVariant("b_test_01"), {
      to: "PREPARING_WORKSPACE"
    });
    const running = applyStateTransition(preparing, {
      to: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      executionContext: buildRunningExecutionContext({
        bubbleId: "b_test_01",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-02-21T12:00:00Z",
        watchdogTimeoutMinutes: 30
      }),
      activeSince: "2026-02-21T12:00:00Z",
      lastCommandAt: "2026-02-21T12:01:00Z"
    });

    const waitingHuman = applyStateTransition(running, {
      to: "WAITING_HUMAN",
      lastCommandAt: "2026-02-21T12:02:00Z"
    });

    expect(waitingHuman.active_agent).toBe("codex");
    expect(waitingHuman.active_role).toBe("implementer");
    expect(waitingHuman.active_since).toBe("2026-02-21T12:00:00Z");
    expect(waitingHuman.execution_context).toBeNull();
    expect(waitingHuman.last_command_at).toBe("2026-02-21T12:02:00Z");
  });

  it("clears active ownership when transition fields are explicitly set to null", () => {
    const preparing = applyStateTransition(createInitialVariant("b_test_01"), {
      to: "PREPARING_WORKSPACE"
    });
    const running = applyStateTransition(preparing, {
      to: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      executionContext: buildRunningExecutionContext({
        bubbleId: "b_test_01",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-02-21T12:00:00Z",
        watchdogTimeoutMinutes: 30
      }),
      activeSince: "2026-02-21T12:00:00Z",
      lastCommandAt: "2026-02-21T12:01:00Z"
    });

    const readyForApproval = applyStateTransition(running, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-21T12:03:00Z"
    });

    expect(readyForApproval.active_agent).toBeNull();
    expect(readyForApproval.active_role).toBeNull();
    expect(readyForApproval.active_since).toBeNull();
    expect(readyForApproval.execution_context).toBeNull();
    expect(readyForApproval.last_command_at).toBe("2026-02-21T12:03:00Z");
  });
});
