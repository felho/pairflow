import { describe, expect, it } from "vitest";

import {
  asBubbleStatusError,
  BubbleStatusError,
  getBubbleStatus
} from "../../../../src/core/bubble/statusBubble.js";
import {
  asBubbleStatusErrorV11,
  BubbleStatusErrorV11,
  getBubbleStatusV11
} from "../../../../src/v11/application/status/emitStatusV11.js";

describe("status facade parity", () => {
  it("keeps core status exports aligned with v11 source-of-truth exports", () => {
    expect(getBubbleStatus).toBe(getBubbleStatusV11);
    expect(asBubbleStatusError).toBe(asBubbleStatusErrorV11);
    expect(BubbleStatusError).toBe(BubbleStatusErrorV11);
  });
});
