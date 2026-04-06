import { describe, expect, it } from "vitest";

import {
  BubbleCreateError,
  createBubble,
  extractReviewerFocus
} from "../../../../src/core/bubble/createBubble.js";
import {
  BubbleCreateErrorV11,
  createBubbleV11,
  extractReviewerFocusV11
} from "../../../../src/v11/application/create/emitCreateV11.js";

describe("create facade parity", () => {
  it("keeps core create exports aligned with v11 source-of-truth exports", () => {
    expect(createBubble).toBe(createBubbleV11);
    expect(BubbleCreateError).toBe(BubbleCreateErrorV11);
    expect(extractReviewerFocus).toBe(extractReviewerFocusV11);
  });
});
