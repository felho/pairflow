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
  it("keeps core commit exports aligned with v11 source-of-truth exports", () => {
    expect(commitBubble).toBe(commitBubbleV11);
    expect(asBubbleCommitError).toBe(asBubbleCommitErrorV11);
    expect(BubbleCommitError).toBe(BubbleCommitErrorV11);
  });
});
