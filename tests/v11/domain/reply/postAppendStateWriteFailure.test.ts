import { describe, expect, it } from "vitest";

import {
  formatReplyPostAppendStateWriteFailureMessage,
  raiseReplyPostAppendStateWriteFailed
} from "../../../../src/v11/domain/reply/postAppendStateWriteFailure.js";

class TestReplyPostAppendStateWriteFailureError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReplyPostAppendStateWriteFailureError";
  }
}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

function createError(input: PairflowCommandErrorInput): Error {
  return new TestReplyPostAppendStateWriteFailureError(toErrorMessage(input));
}

describe("reply post-append state write failure", () => {
  it("formats deterministic HUMAN_REPLY post-append state-write failure message", () => {
    const message = formatReplyPostAppendStateWriteFailureMessage({
      envelopeId: "env_321",
      reason: "state fingerprint mismatch"
    });

    expect(message).toBe(
      "HUMAN_REPLY env_321 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: state fingerprint mismatch"
    );
  });

  it("raises mapped error via injected createError", () => {
    expect(() =>
      raiseReplyPostAppendStateWriteFailed({
        envelopeId: "env_654",
        reason: "io error",
        createError
      })
    ).toThrowError(
      new TestReplyPostAppendStateWriteFailureError(
        "REPLY_STATE_WRITE_FAILED_POST_APPEND: HUMAN_REPLY env_654 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: io error"
      )
    );
  });
});
