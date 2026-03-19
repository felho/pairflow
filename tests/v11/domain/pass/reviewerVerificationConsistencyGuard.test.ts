import { describe, expect, it } from "vitest";

import { validateReviewerVerificationConsistency } from "../../../../src/v11/domain/pass/reviewerVerificationConsistencyGuard.js";

class TestReviewerVerificationConsistencyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReviewerVerificationConsistencyError";
  }
}

function createError(message: string): Error {
  return new TestReviewerVerificationConsistencyError(message);
}

describe("validateReviewerVerificationConsistency", () => {
  it("allows overall=fail with fix_request and findings", () => {
    expect(() =>
      validateReviewerVerificationConsistency({
        payloadOverall: "fail",
        intent: "fix_request",
        hasFindings: true,
        createError
      })
    ).not.toThrow();
  });

  it("rejects overall=fail when intent is not fix_request", () => {
    expect(() =>
      validateReviewerVerificationConsistency({
        payloadOverall: "fail",
        intent: "review",
        hasFindings: true,
        createError
      })
    ).toThrowError(
      new TestReviewerVerificationConsistencyError(
        "Accuracy-critical reviewer PASS with overall=fail requires intent=fix_request and open findings."
      )
    );
  });

  it("rejects overall=fail when findings are missing", () => {
    expect(() =>
      validateReviewerVerificationConsistency({
        payloadOverall: "fail",
        intent: "fix_request",
        hasFindings: false,
        createError
      })
    ).toThrowError(
      new TestReviewerVerificationConsistencyError(
        "Accuracy-critical reviewer PASS with overall=fail requires intent=fix_request and open findings."
      )
    );
  });

  it("allows overall=pass with review and no findings", () => {
    expect(() =>
      validateReviewerVerificationConsistency({
        payloadOverall: "pass",
        intent: "review",
        hasFindings: false,
        createError
      })
    ).not.toThrow();
  });

  it("rejects overall=pass when findings exist", () => {
    expect(() =>
      validateReviewerVerificationConsistency({
        payloadOverall: "pass",
        intent: "review",
        hasFindings: true,
        createError
      })
    ).toThrowError(
      new TestReviewerVerificationConsistencyError(
        "Accuracy-critical reviewer PASS with overall=pass requires clean handoff (intent=review and no findings)."
      )
    );
  });

  it("rejects overall=pass when intent is not review", () => {
    expect(() =>
      validateReviewerVerificationConsistency({
        payloadOverall: "pass",
        intent: "fix_request",
        hasFindings: false,
        createError
      })
    ).toThrowError(
      new TestReviewerVerificationConsistencyError(
        "Accuracy-critical reviewer PASS with overall=pass requires clean handoff (intent=review and no findings)."
      )
    );
  });
});
