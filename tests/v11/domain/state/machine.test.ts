import { describe, expect, it } from "vitest";

import { createInitialBubbleState } from "../../../../src/v11/domain/state/initialState.js";
import { applyStateTransition } from "../../../../src/v11/domain/state/machine.js";
import {
  deriveStartPreparingState,
  deriveStartRunningState
} from "../../../../src/v11/domain/state/startState.js";
import { deriveWatchdogWaitingHumanState } from "../../../../src/v11/domain/state/watchdogEscalation.js";
import {
  StateTransitionError,
  getAllowedTransitions,
  isFinalState
} from "../../../../src/v11/domain/state/transitions.js";

describe("v11 domain state machine", () => {
  it("applies valid transitions and clears execution context for non-running states", () => {
    const initial = createInitialBubbleState("b_v11_state_machine_01");
    const preparing = applyStateTransition(initial, {
      to: "PREPARING_WORKSPACE",
      round: 1,
      lastCommandAt: "2026-04-06T10:00:00.000Z"
    });

    expect(preparing.state).toBe("PREPARING_WORKSPACE");
    expect(preparing.round).toBe(1);
    expect(preparing.execution_context).toBeNull();
  });

  it("rejects invalid transitions with the canonical domain error", () => {
    const initial = createInitialBubbleState("b_v11_state_machine_02");

    expect(() =>
      applyStateTransition(initial, {
        to: "DONE"
      })
    ).toThrow(StateTransitionError);
  });

  it("exposes allowed transition helpers from the v11 domain owner", () => {
    expect(getAllowedTransitions("RUNNING")).toEqual([
      "WAITING_HUMAN",
      "READY_FOR_HUMAN_APPROVAL",
      "FAILED",
      "CANCELLED"
    ]);
    expect(isFinalState("DONE")).toBe(true);
  });

  it("derives watchdog escalation state without persistence concerns", () => {
    const initial = createInitialBubbleState("b_v11_watchdog_state_01");
    const preparing = applyStateTransition(initial, {
      to: "PREPARING_WORKSPACE",
      round: 0,
      lastCommandAt: "2026-04-06T10:00:00.000Z"
    });
    const running = applyStateTransition(preparing, {
      to: "RUNNING",
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-04-06T10:00:00.000Z",
      lastCommandAt: "2026-04-06T10:00:00.000Z"
    });

    const waiting = deriveWatchdogWaitingHumanState({
      state: running,
      lastCommandAt: "2026-04-06T10:31:00.000Z"
    });

    expect(waiting.state).toBe("WAITING_HUMAN");
    expect(waiting.last_command_at).toBe("2026-04-06T10:31:00.000Z");
    expect(waiting.execution_context).toBeNull();
    expect(waiting.active_agent).toBe("codex");
    expect(waiting.active_role).toBe("implementer");
  });

  it("derives fresh start states without persistence concerns", () => {
    const initial = createInitialBubbleState("b_v11_start_state_01");
    const preparing = deriveStartPreparingState({
      state: initial,
      lastCommandAt: "2026-04-06T10:00:00.000Z"
    });
    const running = deriveStartRunningState({
      preparingState: preparing,
      lastCommandAt: "2026-04-06T10:01:00.000Z",
      bubbleId: initial.bubble_id,
      implementer: "codex",
      reviewer: "claude",
      watchdogTimeoutMinutes: 30,
      ideationPending: false
    });

    expect(preparing.state).toBe("PREPARING_WORKSPACE");
    expect(running.state).toBe("RUNNING");
    expect(running.round).toBe(1);
    expect(running.active_agent).toBe("codex");
    expect(running.active_role).toBe("implementer");
    expect(running.execution_context?.active_role).toBe("implementer");
    expect(running.round_role_history).toStrictEqual([
      {
        round: 1,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-04-06T10:01:00.000Z"
      }
    ]);
  });
});
