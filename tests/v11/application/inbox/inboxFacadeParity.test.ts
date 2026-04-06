import { describe, expect, it } from "vitest";

import {
  asBubbleInboxError,
  BubbleInboxError,
  getBubbleInbox
} from "../../../../src/core/bubble/inboxBubble.js";
import {
  asBubbleInboxErrorV11,
  BubbleInboxErrorV11,
  getBubbleInboxV11
} from "../../../../src/v11/application/inbox/emitInboxV11.js";

describe("inbox facade parity", () => {
  it("keeps core inbox exports aligned with v11 source-of-truth exports", () => {
    expect(getBubbleInbox).toBe(getBubbleInboxV11);
    expect(asBubbleInboxError).toBe(asBubbleInboxErrorV11);
    expect(BubbleInboxError).toBe(BubbleInboxErrorV11);
  });
});
