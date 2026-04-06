import { describe, expect, it } from "vitest";

import {
  asOpenBubbleError,
  OpenBubbleError,
  openBubble
} from "../../../../src/core/bubble/openBubble.js";
import {
  asOpenBubbleErrorV11,
  OpenBubbleErrorV11,
  openBubbleV11
} from "../../../../src/v11/application/open/emitOpenV11.js";

describe("open facade parity", () => {
  it("keeps core open exports aligned with v11 source-of-truth exports", () => {
    expect(openBubble).toBe(openBubbleV11);
    expect(asOpenBubbleError).toBe(asOpenBubbleErrorV11);
    expect(OpenBubbleError).toBe(OpenBubbleErrorV11);
  });
});
