import { describe, expect, it } from "vitest";

import {
  getBubbleStartHelpText,
  parseBubbleStartCommandOptions,
  runBubbleStartCommand
} from "../../../../src/cli/commands/bubble/start.js";
import {
  getBubbleStartHelpText as getBubbleStartHelpTextV11,
  parseBubbleStartCommandOptions as parseBubbleStartCommandOptionsV11,
  runBubbleStartCommand as runBubbleStartCommandV11
} from "../../../../src/v11/application/start/startCliCommand.js";

describe("start CLI entrypoint parity", () => {
  it("keeps legacy CLI start exports routed to v11 entrypoint", () => {
    expect(getBubbleStartHelpText).toBe(getBubbleStartHelpTextV11);
    expect(parseBubbleStartCommandOptions).toBe(parseBubbleStartCommandOptionsV11);
    expect(runBubbleStartCommand).toBe(runBubbleStartCommandV11);
  });
});
