import { describe, expect, it } from "vitest";

import {
  asAttachBubbleError,
  attachBubble,
  AttachBubbleError
} from "../../../../src/core/bubble/attachBubble.js";
import {
  asAttachBubbleErrorV11,
  attachBubbleV11,
  AttachBubbleErrorV11
} from "../../../../src/v11/application/attach/emitAttachV11.js";

describe("attach facade parity", () => {
  it("keeps core attach exports aligned with v11 source-of-truth exports", () => {
    expect(attachBubble).toBe(attachBubbleV11);
    expect(asAttachBubbleError).toBe(asAttachBubbleErrorV11);
    expect(AttachBubbleError).toBe(AttachBubbleErrorV11);
  });
});
