import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/core/bubble/bubbleLookup.js";
import { normalizeReplyCommandError } from "../../../../src/v11/shared/reply/replyCommandErrorNormalization.js";

class SyntheticReplyCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticReplyCommandError";
  }
}

describe("replyCommandErrorNormalization", () => {
  it("reuses reply command error instances unchanged", () => {
    const original = new SyntheticReplyCommandError("already normalized");
    const normalized = normalizeReplyCommandError({
      error: original,
      isReplyCommandError: (candidate) =>
        candidate instanceof SyntheticReplyCommandError,
      isBubbleLookupError: () => false,
      createReplyCommandError: (message) => new SyntheticReplyCommandError(message)
    });

    expect(normalized).toBe(original);
  });

  it("maps BubbleLookupError and generic Error values", () => {
    const fromLookup = normalizeReplyCommandError({
      error: new BubbleLookupError("bubble missing"),
      isReplyCommandError: () => false,
      isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError,
      createReplyCommandError: (message) => new SyntheticReplyCommandError(message)
    });
    const fromGeneric = normalizeReplyCommandError({
      error: new Error("unexpected"),
      isReplyCommandError: () => false,
      isBubbleLookupError: () => false,
      createReplyCommandError: (message) => new SyntheticReplyCommandError(message)
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
      createReplyCommandError: (message) => new SyntheticReplyCommandError(message)
    });
    expect(raw).toBe("raw-error");
  });
});
