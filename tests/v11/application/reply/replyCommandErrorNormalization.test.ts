import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { normalizeReplyCommandError } from "../../../../src/v11/shared/reply/replyCommandErrorNormalization.js";

class SyntheticReplyCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticReplyCommandError";
  }
}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

describe("replyCommandErrorNormalization", () => {
  it("reuses reply command error instances unchanged", () => {
    const original = new SyntheticReplyCommandError("already normalized");
    const normalized = normalizeReplyCommandError({
      error: original,
      isReplyCommandError: (candidate) =>
        candidate instanceof SyntheticReplyCommandError,
      isBubbleLookupError: () => false,
      createReplyCommandError: (input) =>
        new SyntheticReplyCommandError(toErrorMessage(input))
    });

    expect(normalized).toBe(original);
  });

  it("maps BubbleLookupError and generic Error values", () => {
    const fromLookup = normalizeReplyCommandError({
      error: new BubbleLookupError("bubble missing"),
      isReplyCommandError: () => false,
      isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError,
      createReplyCommandError: (input) =>
        new SyntheticReplyCommandError(toErrorMessage(input))
    });
    const fromGeneric = normalizeReplyCommandError({
      error: new Error("unexpected"),
      isReplyCommandError: () => false,
      isBubbleLookupError: () => false,
      createReplyCommandError: (input) =>
        new SyntheticReplyCommandError(toErrorMessage(input))
    });

    expect(fromLookup).toBeInstanceOf(SyntheticReplyCommandError);
    expect((fromLookup as Error).message).toBe("bubble missing");
    expect(fromGeneric).toBeInstanceOf(SyntheticReplyCommandError);
    expect((fromGeneric as Error).message).toBe("unexpected");
  });

  it("passes through non-Error values", () => {
    const raw = normalizeReplyCommandError({
      error: "raw-error",
      isReplyCommandError: () => false,
      isBubbleLookupError: () => false,
      createReplyCommandError: (input) =>
        new SyntheticReplyCommandError(toErrorMessage(input))
    });
    expect(raw).toBe("raw-error");
  });
});
