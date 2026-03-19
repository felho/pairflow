import { describe, expect, it } from "vitest";

import type { AgentName, BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import { resolvePassHandoff } from "../../../../src/v11/domain/pass/handoff.js";

const implementer: AgentName = "codex";
const reviewer: AgentName = "claude";
const nowIso = "2026-03-19T12:00:00.000Z";

class TestPassError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestPassError";
  }
}

function buildRunningState(
  overrides: Partial<BubbleStateSnapshot> = {}
): BubbleStateSnapshot {
  return {
    bubble_id: "b_handoff_01",
    state: "RUNNING",
    round: 1,
    active_agent: implementer,
    active_since: "2026-03-19T11:59:00.000Z",
    active_role: "implementer",
    round_role_history: [
      {
        round: 1,
        implementer,
        reviewer,
        switched_at: "2026-03-19T11:00:00.000Z"
      }
    ],
    last_command_at: "2026-03-19T11:59:30.000Z",
    ...overrides
  };
}

function resolveFromState(state: BubbleStateSnapshot) {
  return resolvePassHandoff({
    state,
    implementer,
    reviewer,
    nowIso,
    createError: (message) => new TestPassError(message)
  });
}

describe("resolvePassHandoff", () => {
  it("returns implementer -> reviewer handoff without round increment", () => {
    const resolved = resolveFromState(
      buildRunningState({
        round: 3,
        active_agent: implementer,
        active_role: "implementer"
      })
    );

    expect(resolved).toEqual({
      senderAgent: implementer,
      senderRole: "implementer",
      recipientAgent: reviewer,
      recipientRole: "reviewer",
      envelopeRound: 3,
      nextRound: 3
    });
  });

  it("returns reviewer -> implementer handoff and appends next round entry when missing", () => {
    const resolved = resolveFromState(
      buildRunningState({
        round: 2,
        active_agent: reviewer,
        active_role: "reviewer",
        round_role_history: [
          {
            round: 1,
            implementer,
            reviewer,
            switched_at: "2026-03-19T11:00:00.000Z"
          },
          {
            round: 2,
            implementer,
            reviewer,
            switched_at: "2026-03-19T11:30:00.000Z"
          }
        ]
      })
    );

    expect(resolved).toEqual({
      senderAgent: reviewer,
      senderRole: "reviewer",
      recipientAgent: implementer,
      recipientRole: "implementer",
      envelopeRound: 2,
      nextRound: 3,
      appendRoundRoleEntry: {
        round: 3,
        implementer,
        reviewer,
        switched_at: nowIso
      }
    });
  });

  it("skips round-role append when next round entry already exists", () => {
    const resolved = resolveFromState(
      buildRunningState({
        round: 2,
        active_agent: reviewer,
        active_role: "reviewer",
        round_role_history: [
          {
            round: 1,
            implementer,
            reviewer,
            switched_at: "2026-03-19T11:00:00.000Z"
          },
          {
            round: 2,
            implementer,
            reviewer,
            switched_at: "2026-03-19T11:30:00.000Z"
          },
          {
            round: 3,
            implementer,
            reviewer,
            switched_at: "2026-03-19T12:00:00.000Z"
          }
        ]
      })
    );

    expect(resolved.appendRoundRoleEntry).toBeUndefined();
    expect(resolved.nextRound).toBe(3);
  });

  it("throws configured error when state is not RUNNING", () => {
    expect(() =>
      resolveFromState(
        buildRunningState({
          state: "CREATED"
        })
      )
    ).toThrowError(
      new TestPassError("PASS can only be used while bubble is RUNNING (current: CREATED).")
    );
  });

  it("throws configured error when active role/agent mapping is invalid", () => {
    expect(() =>
      resolveFromState(
        buildRunningState({
          active_role: "reviewer",
          active_agent: implementer
        })
      )
    ).toThrowError(
      new TestPassError(
        `Active role reviewer must map to configured reviewer agent (${reviewer}).`
      )
    );
  });

  it("throws configured error when round is below 1", () => {
    expect(() =>
      resolveFromState(
        buildRunningState({
          round: 0
        })
      )
    ).toThrowError(new TestPassError("RUNNING state must have round >= 1 (found 0)."));
  });
});
