import { describe, expect, it } from "vitest";

import {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions,
  runBubbleMetaReviewCommand
} from "../../../../src/cli/commands/bubble/metaReview.js";
import {
  getBubbleMetaReviewHelpText as getBubbleMetaReviewHelpTextV11,
  parseBubbleMetaReviewCommandOptions as parseBubbleMetaReviewCommandOptionsV11,
  runBubbleMetaReviewCommand as runBubbleMetaReviewCommandV11
} from "../../../../src/v11/application/metaReview/metaReviewCliCommand.js";

describe("meta-review CLI entrypoint parity", () => {
  it("keeps legacy CLI meta-review exports routed to v11 entrypoint", () => {
    expect(getBubbleMetaReviewHelpText).toBe(getBubbleMetaReviewHelpTextV11);
    expect(parseBubbleMetaReviewCommandOptions).toBe(
      parseBubbleMetaReviewCommandOptionsV11
    );
    expect(runBubbleMetaReviewCommand).toBe(runBubbleMetaReviewCommandV11);
  });
});
