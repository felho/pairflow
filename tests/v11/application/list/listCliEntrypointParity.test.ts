import { describe, expect, it } from "vitest";

import {
  getBubbleListHelpText,
  parseBubbleListCommandOptions,
  renderBubbleListText,
  runBubbleListCommand
} from "../../../../src/cli/commands/bubble/list.js";
import {
  getBubbleListHelpText as getBubbleListHelpTextV11,
  parseBubbleListCommandOptions as parseBubbleListCommandOptionsV11,
  renderBubbleListText as renderBubbleListTextV11,
  runBubbleListCommand as runBubbleListCommandV11
} from "../../../../src/v11/application/list/listCliCommand.js";

describe("list CLI entrypoint parity", () => {
  it("keeps legacy CLI list exports routed to v11 entrypoint", () => {
    expect(getBubbleListHelpText).toBe(getBubbleListHelpTextV11);
    expect(parseBubbleListCommandOptions).toBe(parseBubbleListCommandOptionsV11);
    expect(renderBubbleListText).toBe(renderBubbleListTextV11);
    expect(runBubbleListCommand).toBe(runBubbleListCommandV11);
  });
});
