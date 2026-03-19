import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/core/bubble/bubbleLookup.js";
import {
  createHumanReplyCommandError,
  HumanReplyCommandError,
  throwAsHumanReplyCommandError
} from "../../../../src/v11/shared/reply/replyCommandError.js";

describe("replyCommandError", () => {
  it("creates typed HumanReplyCommandError instances", () => {
    const error = createHumanReplyCommandError("invalid reply");

    expect(error).toBeInstanceOf(HumanReplyCommandError);
    expect(error.message).toBe("invalid reply");
    expect(error.name).toBe("HumanReplyCommandError");
  });

  it("rethrows existing HumanReplyCommandError unchanged", () => {
    const original = new HumanReplyCommandError("already normalized");

    try {
      throwAsHumanReplyCommandError(original);
      throw new Error("unreachable");
    } catch (error) {
      expect(error).toBe(original);
    }
  });

  it("maps BubbleLookupError and generic Error to HumanReplyCommandError", () => {
    let bubbleLookupMapped: unknown;
    let genericMapped: unknown;

    try {
      throwAsHumanReplyCommandError(new BubbleLookupError("bubble missing"));
    } catch (error) {
      bubbleLookupMapped = error;
    }

    try {
      throwAsHumanReplyCommandError(new Error("unexpected"));
    } catch (error) {
      genericMapped = error;
    }

    expect(bubbleLookupMapped).toBeInstanceOf(HumanReplyCommandError);
    expect((bubbleLookupMapped as Error).message).toBe("bubble missing");
    expect(genericMapped).toBeInstanceOf(HumanReplyCommandError);
    expect((genericMapped as Error).message).toBe("unexpected");
  });

  it("passes through non-Error values unchanged", () => {
    try {
      throwAsHumanReplyCommandError("raw-error");
      throw new Error("unreachable");
    } catch (error) {
      expect(error).toBe("raw-error");
    }
  });
});
