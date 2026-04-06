import { describe, expect, it } from "vitest";

import {
  asBubbleListError,
  BubbleListError,
  listBubbles
} from "../../../../src/core/bubble/listBubbles.js";
import {
  asBubbleListErrorV11,
  BubbleListErrorV11,
  listBubblesV11
} from "../../../../src/v11/application/list/emitListV11.js";

describe("list facade parity", () => {
  it("keeps core list exports aligned with v11 source-of-truth exports", () => {
    expect(listBubbles).toBe(listBubblesV11);
    expect(asBubbleListError).toBe(asBubbleListErrorV11);
    expect(BubbleListError).toBe(BubbleListErrorV11);
  });
});
