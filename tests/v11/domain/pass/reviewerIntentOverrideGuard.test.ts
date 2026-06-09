import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { assertReviewerIntentOverrideConsistency } from "../../../../src/v11/domain/pass/reviewerIntentOverrideGuard.js";

class TestReviewerIntentOverrideError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReviewerIntentOverrideError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestReviewerIntentOverrideError(toErrorMessage(message));
}

describe("assertReviewerIntentOverrideConsistency", () => {
  it("rejects reviewer intent=task", () => {
    expect(() =>
      assertReviewerIntentOverrideConsistency({
        intent: "task",
        noFindings: false,
        hasFindings: true,
        createError
      })
    ).toThrowError(
      new TestReviewerIntentOverrideError(
        "REVIEWER_INTENT_OVERRIDE_INVALID: Reviewer PASS cannot use intent=task."
      )
    );
  });

  it("rejects reviewer intent=task with --no-findings", () => {
    expect(() =>
      assertReviewerIntentOverrideConsistency({
        intent: "task",
        noFindings: true,
        hasFindings: false,
        createError
      })
    ).toThrowError(
      new TestReviewerIntentOverrideError(
        "REVIEWER_INTENT_OVERRIDE_INVALID: Reviewer PASS cannot use intent=task."
      )
    );
  });

  it("rejects --no-findings with intent=fix_request", () => {
    expect(() =>
      assertReviewerIntentOverrideConsistency({
        intent: "fix_request",
        noFindings: true,
        hasFindings: false,
        createError
      })
    ).toThrowError(
      new TestReviewerIntentOverrideError(
        "REVIEWER_INTENT_OVERRIDE_INVALID: Reviewer PASS with --no-findings cannot use intent=fix_request."
      )
    );
  });

  it("rejects findings with intent=review", () => {
    expect(() =>
      assertReviewerIntentOverrideConsistency({
        intent: "review",
        noFindings: false,
        hasFindings: true,
        createError
      })
    ).toThrowError(
      new TestReviewerIntentOverrideError(
        "REVIEWER_INTENT_OVERRIDE_INVALID: Reviewer PASS with findings cannot use intent=review."
      )
    );
  });

  it("allows clean reviewer handoff with intent=review", () => {
    expect(() =>
      assertReviewerIntentOverrideConsistency({
        intent: "review",
        noFindings: true,
        hasFindings: false,
        createError
      })
    ).not.toThrow();
  });

  it("allows findings reviewer handoff with intent=fix_request", () => {
    expect(() =>
      assertReviewerIntentOverrideConsistency({
        intent: "fix_request",
        noFindings: false,
        hasFindings: true,
        createError
      })
    ).not.toThrow();
  });
});
