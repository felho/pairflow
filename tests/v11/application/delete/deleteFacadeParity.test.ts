import { describe, expect, it } from "vitest";

import {
  asDeleteBubbleError,
  DeleteBubbleError,
  deleteBubble
} from "../../../../src/core/bubble/deleteBubble.js";
import {
  asDeleteBubbleError as asDeleteBubbleErrorV11,
  DeleteBubbleError as DeleteBubbleErrorV11,
  deleteBubble as deleteBubbleV11
} from "../../../../src/v11/application/delete/deleteBubble.js";

describe("delete facade parity", () => {
  it("keeps core delete exports aligned with v11 source-of-truth exports", () => {
    expect(deleteBubble).toBe(deleteBubbleV11);
    expect(asDeleteBubbleError).toBe(asDeleteBubbleErrorV11);
    expect(DeleteBubbleError).toBe(DeleteBubbleErrorV11);
  });
});
