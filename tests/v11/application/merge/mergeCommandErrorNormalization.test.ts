import { describe, expect, it } from "vitest";

import {
  BubbleMergeError,
  createBubbleMergeError
} from "../../../../src/v11/shared/merge/mergeCommandErrorRuntime.js";
import { normalizeBubbleMergeError } from "../../../../src/v11/shared/merge/mergeCommandErrorNormalization.js";

describe("mergeCommandErrorNormalization", () => {
  it("preserves bubble merge errors", () => {
    const original = new BubbleMergeError("already normalized");
    const normalized = normalizeBubbleMergeError({
      error: original,
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError
    });

    expect(normalized).toBe(original);
  });

  it("maps generic errors to bubble merge error", () => {
    const normalized = normalizeBubbleMergeError({
      error: new Error("bubble missing"),
      isBubbleMergeError: (candidate) => candidate instanceof BubbleMergeError,
      createBubbleMergeError
    });

    expect(normalized).toBeInstanceOf(BubbleMergeError);
    expect((normalized as Error).message).toBe("bubble missing");
  });
});
