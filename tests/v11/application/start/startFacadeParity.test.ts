import { describe, expect, it } from "vitest";

import {
  asStartBubbleError,
  StartBubbleError,
  startBubble
} from "../../../../src/core/bubble/startBubble.js";
import {
  asStartBubbleErrorV11,
  StartBubbleErrorV11,
  startBubbleV11
} from "../../../../src/v11/application/start/emitStartV11.js";

describe("start facade parity", () => {
  it("keeps core start exports aligned with v11 source-of-truth exports", () => {
    expect(startBubble).toBe(startBubbleV11);
    expect(asStartBubbleError).toBe(asStartBubbleErrorV11);
    expect(StartBubbleError).toBe(StartBubbleErrorV11);
  });
});
