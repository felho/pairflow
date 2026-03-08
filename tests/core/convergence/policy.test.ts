import { describe, expect, it } from "vitest";

import {
  evaluateReviewerFindingsAggregate,
  validateConvergencePolicy
} from "../../../src/core/convergence/policy.js";
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

function createConvergenceEnvelope(
  partial: Partial<ProtocolEnvelope>
): ProtocolEnvelope {
  return {
    id: "msg_20260222_002",
    ts: "2026-02-22T12:04:00.000Z",
    bubble_id: "b_policy_01",
    sender: "claude",
    recipient: "orchestrator",
    type: "CONVERGENCE",
    round: 4,
    payload: {
      summary: "Ready for approval."
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
      severity_gate_round: 4,
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
    expect(result.errors).toHaveLength(1);
    expect(
      result.errors.some((error) => error.includes("invalid findings payload"))
    ).toBe(true);
  });

  it("downgrades document-scope P0 finding to non-blocking when strict blocker qualifiers are missing", () => {
    const aggregate = evaluateReviewerFindingsAggregate({
      reviewArtifactType: "document",
      findings: [
        {
          severity: "P0",
          title: "Doc-scope declared blocker without required-now timing",
          timing: "later-hardening",
          layer: "L1"
        }
      ]
    });

    expect(aggregate.invalid).toBe(false);
    expect(aggregate.p0).toBe(0);
    expect(aggregate.p1).toBe(0);
    expect(aggregate.p2).toBe(1);
    expect(aggregate.p3).toBe(0);
    expect(aggregate.hasBlocking).toBe(false);
    expect(aggregate.hasNonBlocking).toBe(true);
  });

  it("requires explicit findings declaration on previous reviewer PASS", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 4,
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
      severity_gate_round: 4,
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
      severity_gate_round: 4,
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
      severity_gate_round: 4,
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
      severity_gate_round: 4,
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
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 4,
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
            summary: "R3 reviewer PASS. 0 findings (0 P0, 0 P1, 0 P2, 0 P3).",
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
      severity_gate_round: 4,
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

  it("allows convergence in round 4 when previous reviewer PASS has only P2 findings", () => {
    const result = validateConvergencePolicy({
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 4,
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

  it("accepts previous-round reviewer CONVERGENCE as a qualifying reviewer verdict", () => {
    const result = validateConvergencePolicy({
      currentRound: 5,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 4,
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
        },
        {
          round: 5,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T12:07:00.000Z"
        }
      ],
      transcript: [
        createConvergenceEnvelope({
          round: 4
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("keeps document-scope blocker criteria strict when timing/layer are missing", () => {
    const result = validateConvergencePolicy({
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "document",
      severity_gate_round: 4,
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
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "document",
      severity_gate_round: 4,
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
      currentRound: 4,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "document",
      severity_gate_round: 4,
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

  it("returns explicit round-1 guardrail error code when convergence is requested in round 1", () => {
    const result = validateConvergencePolicy({
      currentRound: 1,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 4,
      roundRoleHistory: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:59:00.000Z"
        }
      ],
      transcript: []
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]).toContain("ROUND1_CONVERGENCE_GUARDRAIL");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Convergence requires reviewer-role alternation evidence across at least two rounds.",
        "CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING: Convergence requires a previous reviewer PASS or CONVERGENCE verdict from the prior round."
      ])
    );
  });

  it("returns explicit previous reviewer pass missing reason code", () => {
    const result = validateConvergencePolicy({
      currentRound: 3,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 4,
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
      transcript: []
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING")
      )
    ).toBe(true);
  });

  it("rejects invalid severity_gate_round policy input", () => {
    const result = validateConvergencePolicy({
      currentRound: 2,
      reviewer: "claude",
      implementer: "codex",
      reviewArtifactType: "auto",
      severity_gate_round: 3,
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
            summary: "R1 reviewer PASS. 0 findings.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("SEVERITY_GATE_ROUND_INVALID")
      )
    ).toBe(true);
  });
});
