import { describe, expect, it } from "vitest";

import {
  getBubbleInboxHelpText,
  parseBubbleInboxCommandOptions,
  renderBubbleInboxText,
  runBubbleInboxCommand
} from "../../../../src/cli/commands/bubble/inbox.js";
import {
  getBubbleInboxHelpText as getBubbleInboxHelpTextV11,
  parseBubbleInboxCommandOptions as parseBubbleInboxCommandOptionsV11,
  renderBubbleInboxText as renderBubbleInboxTextV11,
  runBubbleInboxCommand as runBubbleInboxCommandV11
} from "../../../../src/v11/application/inbox/inboxCliCommand.js";

describe("inbox CLI entrypoint parity", () => {
  it("keeps legacy CLI inbox exports routed to v11 entrypoint", () => {
    expect(getBubbleInboxHelpText).toBe(getBubbleInboxHelpTextV11);
    expect(parseBubbleInboxCommandOptions).toBe(parseBubbleInboxCommandOptionsV11);
    expect(renderBubbleInboxText).toBe(renderBubbleInboxTextV11);
    expect(runBubbleInboxCommand).toBe(runBubbleInboxCommandV11);
  });
});
