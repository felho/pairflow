import { describe, expect, it } from "vitest";

import {
  formatPostAppendReviewVerificationWriteFailureMessage,
  raisePostAppendReviewVerificationWriteFailed
} from "../../../../src/v11/domain/pass/postAppendReviewVerificationWriteFailure.js";

class TestPostAppendReviewVerificationWriteFailureError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestPostAppendReviewVerificationWriteFailureError";
  }
}

function createError(message: string): Error {
  return new TestPostAppendReviewVerificationWriteFailureError(message);
}

describe("postAppendReviewVerificationWriteFailure", () => {
  it("formats deterministic post-append write failure message", () => {
    const message = formatPostAppendReviewVerificationWriteFailureMessage({
      envelopeId: "env_123",
      reason: "permission denied"
    });
    expect(message).toBe(
      "PASS env_123 was appended but review-verification artifact write failed before state transition. State remains unchanged and transcript is canonical; recover via state reconciliation from transcript tail after fixing artifact path/input. Root error: permission denied"
    );
  });

  it("raises mapped error via injected createError", () => {
    expect(() =>
      raisePostAppendReviewVerificationWriteFailed({
        envelopeId: "env_456",
        reason: "disk full",
        createError
      })
    ).toThrowError(
      new TestPostAppendReviewVerificationWriteFailureError(
        "PASS env_456 was appended but review-verification artifact write failed before state transition. State remains unchanged and transcript is canonical; recover via state reconciliation from transcript tail after fixing artifact path/input. Root error: disk full"
      )
    );
  });
});
