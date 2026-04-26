import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { Finding } from "../../../../src/types/findings.js";
import {
  assertReviewerNoFindingsSummaryConsistency,
  inferReviewerPassIntent,
  validateReviewerPassGate
} from "../../../../src/v11/domain/pass/reviewerDecision.js";

class TestReviewerDecisionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReviewerDecisionError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestReviewerDecisionError(toErrorMessage(message));
}

function expectDecisionError(action: () => void, expected: RegExp): void {
  try {
    action();
    throw new Error("expected reviewer decision error");
  } catch (error) {
    expect(error).toBeInstanceOf(TestReviewerDecisionError);
    const message = error instanceof Error ? error.message : String(error);
    expect(message).toMatch(expected);
  }
}

function isCommandErrorObject(
  value: PairflowCommandErrorInput
): value is Exclude<PairflowCommandErrorInput, string> {
  return typeof value !== "string";
}

describe("inferReviewerPassIntent", () => {
  it("rejects mutually exclusive findings inputs", () => {
    expectDecisionError(
      () =>
        inferReviewerPassIntent({
          hasFindings: true,
          noFindings: true,
          createError
        }),
      /cannot use both --finding and --no-findings/u
    );
  });

  it("rejects missing explicit findings declaration", () => {
    expectDecisionError(
      () =>
        inferReviewerPassIntent({
          hasFindings: false,
          noFindings: false,
          createError
        }),
      /^FINDINGS_PAYLOAD_INVALID:/u
    );
  });

  it("maps clean reviewer pass to review intent", () => {
    const intent = inferReviewerPassIntent({
      hasFindings: false,
      noFindings: true,
      createError
    });
    expect(intent).toBe("review");
  });

  it("maps findings reviewer pass to fix_request intent", () => {
    const intent = inferReviewerPassIntent({
      hasFindings: true,
      noFindings: false,
      createError
    });
    expect(intent).toBe("fix_request");
  });
});

describe("validateReviewerPassGate", () => {
  const p1Finding: Finding = {
    severity: "P1",
    title: "Blocking issue"
  };
  const p2Finding: Finding = {
    severity: "P2",
    title: "Non-blocking issue"
  };
  const p3Finding: Finding = {
    severity: "P3",
    title: "Minor cleanup"
  };

  it("allows pre-gate clean reviewer pass", () => {
    expect(() =>
      validateReviewerPassGate({
        round: 1,
        noFindings: true,
        findings: [],
        findingsPayloadInvalid: false,
        reviewArtifactType: "code",
        severityGateRound: 3,
        reviewerBlockingMinSeverity: "P3",
        createError
      })
    ).not.toThrow();
  });

  it("rejects post-gate --no-findings", () => {
    expectDecisionError(
      () =>
        validateReviewerPassGate({
          round: 3,
          noFindings: true,
          findings: [],
          findingsPayloadInvalid: false,
          reviewArtifactType: "code",
          severityGateRound: 3,
          reviewerBlockingMinSeverity: "P3",
          createError
        }),
      /^REVIEWER_PASS_NO_FINDINGS_POST_GATE:/u
    );
  });

  it("rejects invalid findings payload", () => {
    expectDecisionError(
      () =>
        validateReviewerPassGate({
          round: 2,
          noFindings: false,
          findings: [],
          findingsPayloadInvalid: true,
          reviewArtifactType: "code",
          severityGateRound: 3,
          reviewerBlockingMinSeverity: "P3",
          createError
        }),
      /^FINDINGS_PAYLOAD_INVALID: Reviewer PASS findings payload is invalid\./u
    );
  });

  it("allows post-gate P3-only findings when reviewer threshold is P3", () => {
    expect(() =>
      validateReviewerPassGate({
        round: 3,
        noFindings: false,
        findings: [p3Finding],
        findingsPayloadInvalid: false,
        reviewArtifactType: "code",
        severityGateRound: 3,
        reviewerBlockingMinSeverity: "P3",
        createError
      })
    ).not.toThrow();
  });

  it("rejects post-gate P3-only finding set when reviewer threshold is P2", () => {
    expectDecisionError(
      () =>
        validateReviewerPassGate({
          round: 3,
          noFindings: false,
          findings: [p3Finding],
          findingsPayloadInvalid: false,
          reviewArtifactType: "code",
          severityGateRound: 3,
          reviewerBlockingMinSeverity: "P2",
          createError
        }),
      /^REVIEWER_PASS_NON_BLOCKING_POST_GATE:/u
    );
  });

  it("includes structured threshold context in post-gate non-blocking reject errors", () => {
    let captured: Exclude<PairflowCommandErrorInput, string> | undefined;

    expectDecisionError(
      () =>
        validateReviewerPassGate({
          round: 3,
          noFindings: false,
          findings: [p3Finding],
          findingsPayloadInvalid: false,
          reviewArtifactType: "code",
          severityGateRound: 3,
          reviewerBlockingMinSeverity: "P2",
          createError: (input) => {
            if (isCommandErrorObject(input)) {
              captured = input;
            }
            return createError(input);
          }
        }),
      /highest effective open severity=P3/u
    );

    expect(captured?.reasonCode).toBe("REVIEWER_PASS_NON_BLOCKING_POST_GATE");
    expect(captured?.context).toMatchObject({
      guard: "reviewer_pass_decision_input",
      configuredMinSeverity: "P2",
      highestEffectiveOpenSeverity: "P3",
      thresholdCategory: "p3_only",
      reviewArtifactType: "code",
      declaredCanonicalBlockerPresent: false
    });
  });

  it("allows post-gate P2 findings when reviewer threshold is P2", () => {
    expect(() =>
      validateReviewerPassGate({
        round: 3,
        noFindings: false,
        findings: [p2Finding],
        findingsPayloadInvalid: false,
        reviewArtifactType: "code",
        severityGateRound: 3,
        reviewerBlockingMinSeverity: "P2",
        createError
      })
    ).not.toThrow();
  });

  it("documents doc-scope blocker qualifier downgrade diagnostics", () => {
    expectDecisionError(
      () =>
        validateReviewerPassGate({
          round: 3,
          noFindings: false,
          findings: [p1Finding],
          findingsPayloadInvalid: false,
          reviewArtifactType: "document",
          severityGateRound: 3,
          reviewerBlockingMinSeverity: "P1",
          createError
        }),
      /Document scope qualifier: blocker findings require strict `timing=required-now` \+ `layer=L1`/u
    );
  });
});

describe("assertReviewerNoFindingsSummaryConsistency", () => {
  it("allows --no-findings with clean summary", () => {
    expect(() =>
      assertReviewerNoFindingsSummaryConsistency({
        summary: "No findings remain after verification.",
        noFindings: true,
        createError
      })
    ).not.toThrow();
  });

  it("rejects --no-findings when summary contains positive findings assertion", () => {
    expectDecisionError(
      () =>
        assertReviewerNoFindingsSummaryConsistency({
          summary: "2 findings remain open in this round.",
          noFindings: true,
          createError
        }),
      /^REVIEWER_SUMMARY_FINDINGS_CONTRADICTION:/u
    );
  });
});
