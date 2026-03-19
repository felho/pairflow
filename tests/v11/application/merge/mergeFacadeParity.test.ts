import { describe, expect, it } from "vitest";

import {
  asBubbleMergeError,
  BubbleMergeError,
  mergeBubble
} from "../../../../src/core/bubble/mergeBubble.js";
import {
  asBubbleMergeErrorV11,
  BubbleMergeErrorV11,
  mergeBubbleV11
} from "../../../../src/v11/application/merge/emitMergeV11.js";

describe("merge facade parity", () => {
  it("keeps core merge exports aligned with v11 source-of-truth exports", () => {
    expect(mergeBubble).toBe(mergeBubbleV11);
    expect(asBubbleMergeError).toBe(asBubbleMergeErrorV11);
    expect(BubbleMergeError).toBe(BubbleMergeErrorV11);
  });
});
