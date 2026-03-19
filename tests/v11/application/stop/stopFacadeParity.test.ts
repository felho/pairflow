import { describe, expect, it } from "vitest";

import {
  asStopBubbleError,
  StopBubbleError,
  stopBubble
} from "../../../../src/core/bubble/stopBubble.js";
import {
  asStopBubbleErrorV11,
  StopBubbleErrorV11,
  stopBubbleV11
} from "../../../../src/v11/application/stop/emitStopV11.js";

describe("stop facade parity", () => {
  it("keeps core stop exports aligned with v11 source-of-truth exports", () => {
    expect(stopBubble).toBe(stopBubbleV11);
    expect(asStopBubbleError).toBe(asStopBubbleErrorV11);
    expect(StopBubbleError).toBe(StopBubbleErrorV11);
  });
});
