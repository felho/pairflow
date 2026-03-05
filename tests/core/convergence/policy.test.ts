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
      reviewArtifactType: "auto",
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
      reviewArtifactType: "auto",
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
      reviewArtifactType: "auto",
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

  it("keeps non-document blocking on canonical P1 even when effective_priority is downgraded", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
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
            summary: "Non-doc canonical blocker with downgraded effective priority",
            findings: [
              {
                priority: "P1",
                effective_priority: "P2",
                title: "Must still block in non-doc scope"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("open P0/P1"))).toBe(true);
  });

  it("allows convergence in round 2 when previous reviewer PASS has only P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
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

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects convergence when previous reviewer PASS summary reports positive findings counts but findings payload is empty", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
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
            summary: "R1 reviewer PASS. 6 findings (0 P0, 0 P1, 5 P2, 1 P3).",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("summary reports positive finding counts")
      )
    ).toBe(true);
  });

  it("allows convergence when previous reviewer PASS explicitly reports zero findings with empty findings payload", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
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
            summary: "R1 reviewer PASS. 0 findings (0 P0, 0 P1, 0 P2, 0 P3).",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence in round 3 when previous reviewer PASS has only P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 3,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
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

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence from round 4 onward even when previous reviewer PASS has P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
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

  it("keeps document-scope blocker criteria strict when timing/layer are missing", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "document",
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
            summary: "Document-scope finding without strict blocker qualifiers",
            findings: [
              {
                severity: "P1",
                title: "Needs follow-up"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("blocks convergence in document scope only for strict P1 + required-now + L1", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "document",
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
            summary: "Document-scope strict blocker qualifiers present",
            findings: [
              {
                severity: "P1",
                timing: "required-now",
                layer: "L1",
                title: "Strict document blocker"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("open P0/P1"))).toBe(true);
  });

  it("does not block in document scope when effective_priority downgrades strict P1 blocker to P2", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "document",
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
            summary: "Document-scope downgraded blocker signal",
            findings: [
              {
                priority: "P1",
                effective_priority: "P2",
                timing: "required-now",
                layer: "L1",
                title: "Downgraded strict blocker"
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
