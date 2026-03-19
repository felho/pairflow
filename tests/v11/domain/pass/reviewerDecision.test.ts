import { describe, expect, it } from "vitest";

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

function createError(message: string): Error {
  return new TestReviewerDecisionError(message);
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

  it("allows pre-gate clean reviewer pass", () => {
    expect(() =>
      validateReviewerPassGate({
        round: 1,
        noFindings: true,
        findings: [],
        findingsPayloadInvalid: false,
        reviewArtifactType: "code",
        severityGateRound: 3,
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
          createError
        }),
      /^FINDINGS_PAYLOAD_INVALID: Reviewer PASS findings payload is invalid\./u
    );
  });

  it("rejects post-gate non-blocking finding set", () => {
    expectDecisionError(
      () =>
        validateReviewerPassGate({
          round: 3,
          noFindings: false,
          findings: [p2Finding],
          findingsPayloadInvalid: false,
          reviewArtifactType: "code",
          severityGateRound: 3,
          createError
        }),
      /^REVIEWER_PASS_NON_BLOCKING_POST_GATE:/u
    );
  });

  it("allows post-gate blocking findings", () => {
    expect(() =>
      validateReviewerPassGate({
        round: 3,
        noFindings: false,
        findings: [p1Finding],
        findingsPayloadInvalid: false,
        reviewArtifactType: "code",
        severityGateRound: 3,
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
