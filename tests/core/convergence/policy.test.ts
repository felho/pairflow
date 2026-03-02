import { describe, expect, it } from "vitest";

import { validateConvergencePolicy } from "../../../src/core/convergence/policy.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";

function createPassEnvelope(
  partial: Partial<ProtocolEnvelope>
): ProtocolEnvelope {
  return {
    id: "msg_20260222_001",
    ts: "2026-02-22T12:00:00.000Z",
    bubble_id: "b_policy_01",
    sender: "claude",
    recipient: "codex",
    type: "PASS",
    round: 1,
    payload: {
      summary: "Review pass."
    },
    refs: [],
    ...partial
  };
}

describe("validateConvergencePolicy", () => {
  it("rejects malformed findings payload on previous reviewer PASS", () => {
    const transcript = [
      createPassEnvelope({
        payload: {
          summary: "Malformed findings",
          findings: [{ not_severity: "P1" } as unknown as { severity: "P1"; title: string }]
        }
      })
    ];

    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        },
        {
          round: 2,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:01:00.000Z"
        }
      ],
      transcript
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) => error.includes("invalid findings payload"))
    ).toBe(true);
  });

  it("requires explicit findings declaration on previous reviewer PASS", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        },
        {
          round: 2,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:01:00.000Z"
        }
      ],
      transcript: [
        createPassEnvelope({
          payload: {
            summary: "Review pass without findings"
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) => error.includes("declare findings explicitly"))
    ).toBe(true);
  });

  it("flags blocking findings when previous reviewer PASS has P1", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        },
        {
          round: 2,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:01:00.000Z"
        }
      ],
      transcript: [
        createPassEnvelope({
          payload: {
            summary: "Blocking finding",
            findings: [
              {
                severity: "P1",
                title: "Data race"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("open P0/P1"))).toBe(true);
  });

  it("blocks convergence in round 2 when previous reviewer PASS has P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        },
        {
          round: 2,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:01:00.000Z"
        }
      ],
      transcript: [
        createPassEnvelope({
          payload: {
            summary: "Non-blocking finding",
            findings: [
              {
                severity: "P2",
                title: "Functional gap"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("Convergence blocked through round 3")
      )
    ).toBe(true);
  });

  it("blocks convergence in round 3 when previous reviewer PASS has P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 3,
      reviewer: "claude",
      implementer: "codex",
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        },
        {
          round: 2,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:01:00.000Z"
        },
        {
          round: 3,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:03:00.000Z"
        }
      ],
      transcript: [
        createPassEnvelope({
          round: 2,
          payload: {
            summary: "Round 2 non-blocking findings",
            findings: [
              {
                severity: "P2",
                title: "Still significant but non-blocking"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("Convergence blocked through round 3")
      )
    ).toBe(true);
  });

  it("allows convergence from round 4 onward even when previous reviewer PASS has P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        },
        {
          round: 2,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:01:00.000Z"
        },
        {
          round: 3,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:03:00.000Z"
        },
        {
          round: 4,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:05:00.000Z"
        }
      ],
      transcript: [
        createPassEnvelope({
          round: 3,
          payload: {
            summary: "Round 3 non-blocking findings",
            findings: [
              {
                severity: "P2",
                title: "Still non-blocking"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
