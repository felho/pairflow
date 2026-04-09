import { describe, expect, it } from "vitest";

import {
  asBubbleCommitError,
  BubbleCommitError,
  commitBubble
} from "../../../../src/core/bubble/commitBubble.js";
import {
  asBubbleCommitErrorV11,
  BubbleCommitErrorV11,
  commitBubbleV11
} from "../../../../src/v11/application/commit/emitCommitV11.js";

describe("commit facade parity", () => {
  it("keeps core commit exports callable and error exports aligned with v11", () => {
    expect(typeof commitBubble).toBe("function");
    expect(typeof commitBubbleV11).toBe("function");
    expect(asBubbleCommitError).toBe(asBubbleCommitErrorV11);
    expect(BubbleCommitError).toBe(BubbleCommitErrorV11);
  });
});
