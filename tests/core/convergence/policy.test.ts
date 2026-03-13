import { describe, expect, it } from "vitest";

import {
  evaluatePositiveSummaryFindingsAssertion,
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

const missingClaimStateError =
  "CLAIM_STATE_REQUIRED: Convergence requires previous reviewer PASS to declare structured findings claim state/source (payload flags or findings count).";
const missingFindingsParityError =
  "Convergence requires previous reviewer PASS to include payload.findings so blocker parity can be evaluated deterministically.";

describe("evaluatePositiveSummaryFindingsAssertion", () => {
  it("treats undefined and empty summaries as non-positive assertions", () => {
    expect(evaluatePositiveSummaryFindingsAssertion(undefined)).toMatchObject({
      hasPositiveAssertion: false,
      positiveClauseCount: 0
    });
    expect(evaluatePositiveSummaryFindingsAssertion("   ")).toMatchObject({
      hasPositiveAssertion: false,
      positiveClauseCount: 0
    });
  });

  it("detects positive findings/severity assertions", () => {
    const result = evaluatePositiveSummaryFindingsAssertion(
      "P2 findings remain open after reviewer validation."
    );
    expect(result.hasPositiveAssertion).toBe(true);
    expect(result.positiveClauseCount).toBeGreaterThan(0);
  });

  it("covers positive count and signal matcher branches deterministically", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings remain.")
        .hasPositiveAssertion
    ).toBe(true);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings left unresolved.")
        .hasPositiveAssertion
    ).toBe(true);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings persist.")
        .hasPositiveAssertion
    ).toBe(true);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings persists.")
        .hasPositiveAssertion
    ).toBe(true);
    for (const summary of [
      "findings=5",
      "findings:5",
      "findings = 5",
      "findings= 5",
      "findings =5"
    ]) {
      expect(evaluatePositiveSummaryFindingsAssertion(summary).hasPositiveAssertion).toBe(
        true
      );
    }
  });

  it("reports evaluatedClauseCount deterministically across comma/conjunction delimiter splits", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "No findings remain, P2 findings remain open."
      ).evaluatedClauseCount
    ).toBe(2);
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "No findings remain and P2 findings remain open."
      ).evaluatedClauseCount
    ).toBe(2);
  });

  it("reports evaluatedClauseCount deterministically across though/yet delimiter splits", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "No findings remain though P2 findings remain open yet P3 findings remain open."
      ).evaluatedClauseCount
    ).toBe(3);
  });

  it("reports evaluatedClauseCount deterministically across but/however delimiter splits", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "No findings remain but P2 findings remain open."
      ).evaluatedClauseCount
    ).toBe(2);
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "No findings remain however P2 findings remain open."
      ).evaluatedClauseCount
    ).toBe(2);
  });

  it("keeps guard precedence for no-findings and zero-count clauses", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion("No findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No remaining findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No active findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No unresolved findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No active unresolved findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No unresolved active findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("0 findings (0 P0, 0 P1, 0 P2, 0 P3).")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("findings remain: 0")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were 0.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings are 0.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings remained 0.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No P2 or P3 findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No open P2 or P3 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No P2 and P3 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No open P2 and P3 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No P2, P3 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No open P2, P3 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No P2, P3, and P1 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "No open P2, P3, and P1 findings remain."
      ).hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No P2,P3,and P1 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No open P2,P3,and P1 findings remain.")
        .hasPositiveAssertion
    ).toBe(false);
  });

  it("keeps mixed zero-total and positive-severity clauses fail-closed", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion("0 findings (1 P2 finding).")
        .hasPositiveAssertion
    ).toBe(true);
    expect(
      evaluatePositiveSummaryFindingsAssertion(
        "0 findings and 1 P2 finding remain."
      ).hasPositiveAssertion
    ).toBe(true);
  });

  it("treats positive total-findings count with all-zero severity counts as positive assertion", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings (0 P0, 0 P1, 0 P2, 0 P3).")
        .hasPositiveAssertion
    ).toBe(true);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings and 0 P2 findings.")
        .hasPositiveAssertion
    ).toBe(true);
  });

  it("handles comma-separated mixed clauses deterministically", () => {
    const result = evaluatePositiveSummaryFindingsAssertion(
      "No findings remain, P2 findings remain open."
    );
    expect(result.hasPositiveAssertion).toBe(true);
  });

  it("does not treat clean comma-separated guard-only clauses as positive assertions", () => {
    const result = evaluatePositiveSummaryFindingsAssertion(
      "No active findings, no unresolved findings."
    );
    expect(result.hasPositiveAssertion).toBe(false);
  });

  it("handles conjunction-separated mixed clauses deterministically", () => {
    for (const summary of [
      "No findings remain and P2 findings remain open.",
      "No active findings and P2 findings remain open.",
      "No unresolved findings and P2 findings remain open.",
      "0 findings and P2 findings remain open.",
      "No findings remain and 2 findings remain open."
    ]) {
      const result = evaluatePositiveSummaryFindingsAssertion(summary);
      expect(result.hasPositiveAssertion).toBe(true);
    }
  });

  it("handles though/yet-separated mixed clauses deterministically", () => {
    for (const summary of [
      "No findings remain though P2 findings remain open.",
      "No findings remain yet P2 findings remain open."
    ]) {
      const result = evaluatePositiveSummaryFindingsAssertion(summary);
      expect(result.hasPositiveAssertion).toBe(true);
    }
  });

  it("handles while/although/despite-separated mixed clauses deterministically", () => {
    for (const summary of [
      "No findings remain while P2 findings remain open.",
      "No findings remain although P2 findings remain open.",
      "No findings remain despite P2 findings remain open."
    ]) {
      const result = evaluatePositiveSummaryFindingsAssertion(summary);
      expect(result.hasPositiveAssertion).toBe(true);
    }
  });

  it("handles but/however-separated mixed clauses deterministically", () => {
    for (const summary of [
      "No findings remain but P2 findings remain open.",
      "No findings remain however P2 findings remain open."
    ]) {
      const result = evaluatePositiveSummaryFindingsAssertion(summary);
      expect(result.hasPositiveAssertion).toBe(true);
    }
  });

  it("treats negated/resolved severity findings phrasing as non-positive", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were not present.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were addressed.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("Addressed P2 findings.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("No findings found.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were not observed.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were not detected.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were not seen.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were not identified.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were never present.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were never observed.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were not really present.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings were never really present.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings, resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings, were resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("P2 findings had been resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings are resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings remained resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings had been resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings that were resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings which were resolved.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were closed.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were fixed.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were handled.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were addressed.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were cleared.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were not open.")
        .hasPositiveAssertion
    ).toBe(false);
    expect(
      evaluatePositiveSummaryFindingsAssertion("2 findings were never open.")
        .hasPositiveAssertion
    ).toBe(false);
  });

  it("does not classify severity-only status phrasing as positive findings assertion", () => {
    expect(
      evaluatePositiveSummaryFindingsAssertion("Project status: P2 active rollout.")
        .hasPositiveAssertion
    ).toBe(false);
  });
});

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
      result.errors.some((error) => error.includes("CLAIM_STATE_REQUIRED"))
    ).toBe(true);
  });

  it("emits deterministic contradiction reason when previous reviewer PASS has missing findings payload and positive summary assertion", () => {
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
            summary: "P2 findings remain open."
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      missingClaimStateError,
      missingFindingsParityError
    ]);
    expect(
      result.diagnostics.some((entry) =>
        entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
      )
    ).toBe(true);
  });

  it("fails closed when previous reviewer PASS claim source is invalid", () => {
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
            summary: "Clean handoff.",
            findings: [],
            findings_claim_state: "clean",
            findings_claim_source: "legacy_summary_parser"
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) => error.includes("CLAIM_SOURCE_INVALID"))
    ).toBe(true);
  });

  it("fails closed when previous reviewer PASS declares findings_claim_state without findings_claim_source", () => {
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
            summary: "Structured state without source.",
            findings: [],
            findings_claim_state: "clean"
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes(
          "CLAIM_SOURCE_INVALID: previous reviewer PASS findings_claim_source is required when findings_claim_state is provided."
        )
      )
    ).toBe(true);
  });

  it("fails closed when previous reviewer PASS declares findings_claim_source without findings_claim_state", () => {
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
            summary: "Structured source without state.",
            findings: [],
            findings_claim_source: "payload_flags"
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes(
          "CLAIM_STATE_REQUIRED: previous reviewer PASS findings_claim_state is required when findings_claim_source is provided."
        )
      )
    ).toBe(true);
  });

  it("fails closed when structured claim says clean but payload.findings has items", () => {
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
            summary: "Structured clean claim with findings payload mismatch.",
            findings_claim_state: "clean",
            findings_claim_source: "payload_flags",
            findings: [
              {
                severity: "P2",
                title: "Non-blocking finding still present."
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes(
          "CLAIM_SOURCE_INVALID: Convergence blocked because findings_claim_state=clean but payload.findings contains 1 item(s)."
        )
      )
    ).toBe(true);
  });

  it("fails closed when structured claim says open_findings but payload.findings is empty", () => {
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
            summary: "Structured open claim with empty findings payload mismatch.",
            findings_claim_state: "open_findings",
            findings_claim_source: "payload_findings_count",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes(
          "CLAIM_SOURCE_INVALID: Convergence blocked because findings_claim_state=open_findings but payload.findings is empty."
        )
      )
    ).toBe(true);
  });

  it("fails closed when previous reviewer PASS claim state is unknown", () => {
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
            summary: "Unable to classify.",
            findings: [],
            findings_claim_state: "unknown",
            findings_claim_source: "payload_flags"
          }
        })
      ]
    });

    expect(result.ok).toBe(false);
    expect(
      result.errors.some((error) => error.includes("CLAIM_STATE_REQUIRED"))
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

  it("allows post-gate convergence when previous reviewer PASS has P1 findings", () => {
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
            summary: "Round 3 reviewer PASS with blocker",
            findings: [
              {
                severity: "P1",
                title: "Gate condition fixed in round 4"
              }
            ]
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
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

  it("keeps convergence structured-first when summary claims findings but payload claim is clean", () => {
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

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(
      result.diagnostics.some((entry) =>
        entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
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

  it("allows convergence when previous reviewer PASS summary uses explicit no-findings clause with empty findings payload", () => {
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
            summary: "No findings remain after reviewer validation.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when previous reviewer PASS summary says no remaining findings with empty findings payload", () => {
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
            summary: "No remaining findings.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when previous reviewer PASS summary says no active findings with empty findings payload", () => {
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
            summary: "No active findings.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when previous reviewer PASS summary uses double-qualifier no-findings phrasing with empty findings payload", () => {
    for (const summary of [
      "No active unresolved findings.",
      "No unresolved active findings."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("allows convergence when previous reviewer PASS summary says no unresolved findings with empty findings payload", () => {
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
            summary: "No unresolved findings.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when previous reviewer PASS summary says findings remain: 0 with empty findings payload", () => {
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
            summary: "findings remain: 0",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence for severity zero-count phrasing variants with empty findings payload", () => {
    for (const summary of [
      "P2 findings were 0.",
      "P2 findings are 0.",
      "P2 findings remained 0."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("allows convergence when previous reviewer PASS summary says addressed P2 findings with empty findings payload", () => {
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
            summary: "Addressed P2 findings.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when summary contains severity-only status phrasing without findings context", () => {
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
            summary: "Project status: P2 active rollout.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when previous reviewer PASS summary says no open severity findings remain with empty findings payload", () => {
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
            summary: "No open P2 findings remain after reviewer validation.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows convergence when previous reviewer PASS summary says severity findings were not present with empty findings payload", () => {
    for (const summary of [
      "P2 findings were not present in this reviewer pass.",
      "P2 findings were not really present.",
      "P2 findings were never really present."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("allows convergence when previous reviewer PASS summary uses disjointed resolved severity phrasing with empty findings payload", () => {
    for (const summary of [
      "P2 findings, resolved.",
      "P2 findings, were resolved.",
      "P2 findings had been resolved."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("allows convergence when previous reviewer PASS summary uses count-prefixed resolved phrasing with empty findings payload", () => {
    for (const summary of [
      "2 findings were resolved.",
      "2 findings are resolved.",
      "2 findings remained resolved.",
      "2 findings had been resolved.",
      "2 findings that were resolved.",
      "2 findings which were resolved.",
      "2 findings were closed.",
      "2 findings were fixed.",
      "2 findings were handled.",
      "2 findings were addressed.",
      "2 findings were cleared."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("allows convergence when previous reviewer PASS summary uses count-prefixed negation phrasing with empty findings payload", () => {
    for (const summary of ["2 findings were not open.", "2 findings were never open."]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("allows convergence when previous reviewer PASS summary uses multi-severity alternation clean phrasing with empty findings payload", () => {
    for (const summary of [
      "No P2 or P3 findings.",
      "No open P2 or P3 findings remain.",
      "No P2 and P3 findings remain.",
      "No open P2 and P3 findings remain.",
      "No P2, P3 findings remain.",
      "No open P2, P3 findings remain.",
      "No P2, P3, and P1 findings remain.",
      "No open P2, P3, and P1 findings remain.",
      "No P2,P3,and P1 findings remain.",
      "No open P2,P3,and P1 findings remain."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("keeps structured-first routing for no-space positive findings count notation with empty findings payload", () => {
    for (const summary of [
      "findings=5",
      "findings:5",
      "findings = 5",
      "findings= 5",
      "findings =5"
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
  });

  it("keeps structured-first routing for mixed no-findings and positive findings clauses with empty findings payload", () => {
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
            summary: "No findings remain, but P2 findings are still open.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(
      result.diagnostics.some((entry) =>
        entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
      )
    ).toBe(true);
  });

  it("keeps structured-first routing for comma-separated mixed clauses with empty findings payload", () => {
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
            summary: "No findings remain, P2 findings remain open.",
            findings: []
          }
        })
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(
      result.diagnostics.some((entry) =>
        entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
      )
    ).toBe(true);
  });

  it("keeps structured-first routing for but/however delimiter mixed clauses", () => {
    for (const summary of [
      "No findings remain but P2 findings remain open.",
      "No findings remain however P2 findings remain open."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
  });

  it("keeps structured-first routing for though/yet delimiter mixed clauses", () => {
    for (const summary of [
      "No findings remain though P2 findings remain open.",
      "No findings remain yet P2 findings remain open."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
  });

  it("keeps structured-first routing for while/although/despite delimiter mixed clauses", () => {
    for (const summary of [
      "No findings remain while P2 findings remain open.",
      "No findings remain although P2 findings remain open.",
      "No findings remain despite P2 findings remain open."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
  });

  it("keeps structured-first routing for conjunction-separated mixed clauses with empty findings payload", () => {
    for (const summary of [
      "No findings remain and P2 findings remain open.",
      "No active findings and P2 findings remain open.",
      "No unresolved findings and P2 findings remain open.",
      "0 findings and P2 findings remain open.",
      "No findings remain and 2 findings remain open."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
  });

  it("keeps structured-first routing for mixed zero-total and positive-severity count clauses", () => {
    for (const summary of [
      "0 findings (1 P2 finding).",
      "0 findings and 1 P2 finding remain."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
  });

  it("keeps structured-first routing for positive total-findings count with all-zero severity counts", () => {
    for (const summary of [
      "2 findings (0 P0, 0 P1, 0 P2, 0 P3).",
      "2 findings and 0 P2 findings."
    ]) {
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
              summary,
              findings: []
            }
          })
        ]
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(
        result.diagnostics.some((entry) =>
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
        )
      ).toBe(true);
    }
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
