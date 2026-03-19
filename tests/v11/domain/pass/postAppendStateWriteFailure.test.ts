import { describe, expect, it } from "vitest";

import {
  formatPostAppendStateWriteFailureMessage,
  raisePostAppendStateWriteFailed
} from "../../../../src/v11/domain/pass/postAppendStateWriteFailure.js";

class TestPostAppendStateWriteFailureError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestPostAppendStateWriteFailureError";
  }
}

function createError(message: string): Error {
  return new TestPostAppendStateWriteFailureError(message);
}

describe("postAppendStateWriteFailure", () => {
  it("formats deterministic post-append state-write failure message", () => {
    const message = formatPostAppendStateWriteFailureMessage({
      envelopeId: "env_789",
      reason: "state fingerprint mismatch"
    });
    expect(message).toBe(
      "PASS env_789 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: state fingerprint mismatch"
    );
  });

  it("raises mapped error via injected createError", () => {
    expect(() =>
      raisePostAppendStateWriteFailed({
        envelopeId: "env_999",
        reason: "io error",
        createError
      })
    ).toThrowError(
      new TestPostAppendStateWriteFailureError(
        "PASS env_999 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: io error"
      )
    );
  });
});
