import { describe, expect, it } from "vitest";
import type { AgentName } from "../../../../src/contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/shared/state/bubbleStateSnapshotTypes.js";
import { ensureReplyWaitingHumanState } from "../../../../src/v11/domain/reply/waitingHumanStateGuard.js";

const implementer: AgentName = "codex";
const reviewer: AgentName = "claude";

class TestReplyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReplyError";
  }
}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

function buildWaitingHumanState(
  overrides: Partial<BubbleStateSnapshot> = {}
): BubbleStateSnapshot {
  return {
    bubble_id: "b_reply_guard_01",
    state: "WAITING_HUMAN",
    round: 1,
    active_agent: implementer,
    active_since: "2026-03-19T10:00:00.000Z",
    active_role: "implementer",
    round_role_history: [
      {
        round: 1,
        implementer,
        reviewer,
        switched_at: "2026-03-19T09:00:00.000Z"
      }
    ],
    last_command_at: "2026-03-19T09:30:00.000Z",
    ...overrides
  };
}

function ensureFromState(state: BubbleStateSnapshot) {
  return ensureReplyWaitingHumanState({
    state,
    createError: (input) => new TestReplyError(toErrorMessage(input))
  });
}

describe("ensureReplyWaitingHumanState", () => {
  it("returns the original WAITING_HUMAN state when context is valid", () => {
    const state = buildWaitingHumanState({
      round: 3,
      active_agent: reviewer,
      active_role: "reviewer"
    });

    const resolved = ensureFromState(state);

    expect(resolved).toBe(state);
    expect(resolved.active_agent).toBe(reviewer);
    expect(resolved.active_role).toBe("reviewer");
  });

  it("throws configured error when lifecycle state is not WAITING_HUMAN", () => {
    expect(() =>
      ensureFromState(
        buildWaitingHumanState({
          state: "RUNNING"
        })
      )
    ).toThrowError(
      new TestReplyError(
        "REPLY_WAITING_HUMAN_STATE_REQUIRED: bubble reply can only be used while bubble is WAITING_HUMAN (current: RUNNING)."
      )
    );
  });

  it("throws configured error when round is below one", () => {
    expect(() =>
      ensureFromState(
        buildWaitingHumanState({
          round: 0
        })
      )
    ).toThrowError(
      new TestReplyError(
        "REPLY_WAITING_HUMAN_ROUND_INVALID: WAITING_HUMAN state must have round >= 1 (found 0)."
      )
    );
  });

  it("throws configured error when active agent context is incomplete", () => {
    expect(() =>
      ensureFromState(
        buildWaitingHumanState({
          active_agent: null
        })
      )
    ).toThrowError(
      new TestReplyError(
        "REPLY_WAITING_HUMAN_CONTEXT_INCOMPLETE: WAITING_HUMAN state is missing active agent context; cannot resume RUNNING after reply."
      )
    );
  });
});
