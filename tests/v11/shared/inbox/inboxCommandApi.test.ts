import { describe, expect, it } from "vitest";

import {
  asBubbleInboxError,
  BubbleInboxError
} from "../../../../src/v11/shared/inbox/inboxCommandApi.js";
import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";

describe("inboxCommandApi", () => {
  it("normalizes bubble lookup failures with caller context", () => {
    const input = new BubbleLookupError("missing bubble");

    try {
      asBubbleInboxError(input, {
        bubbleId: "b_inbox_ctx_01",
        repoPathProvided: true,
        cwdProvided: true
      });
      throw new Error("Expected BubbleInboxError");
    } catch (error) {
      expect(error).toBeInstanceOf(BubbleInboxError);
      expect(error).toMatchObject({
        message: "missing bubble",
        context: {
          source: "bubble_lookup",
          bubbleId: "b_inbox_ctx_01",
          repoPathProvided: true,
          cwdProvided: true,
          causeName: "BubbleLookupError"
        }
      });
    }
  });

  it("normalizes unexpected failures with caller context", () => {
    const input = new Error("boom");

    try {
      asBubbleInboxError(input, {
        bubbleId: "b_inbox_ctx_02",
        repoPathProvided: false,
        cwdProvided: true
      });
      throw new Error("Expected BubbleInboxError");
    } catch (error) {
      expect(error).toBeInstanceOf(BubbleInboxError);
      expect(error).toMatchObject({
        message: "boom",
        context: {
          source: "unexpected_error",
          bubbleId: "b_inbox_ctx_02",
          repoPathProvided: false,
          cwdProvided: true,
          causeName: "Error"
        }
      });
    }
  });
});
