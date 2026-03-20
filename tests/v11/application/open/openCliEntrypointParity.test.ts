import { describe, expect, it } from "vitest";

import {
  getBubbleOpenHelpText,
  parseBubbleOpenCommandOptions,
  runBubbleOpenCommand
} from "../../../../src/cli/commands/bubble/open.js";
import {
  getBubbleOpenHelpText as getBubbleOpenHelpTextV11,
  parseBubbleOpenCommandOptions as parseBubbleOpenCommandOptionsV11,
  runBubbleOpenCommand as runBubbleOpenCommandV11
} from "../../../../src/v11/application/open/openCliCommand.js";

describe("open CLI entrypoint parity", () => {
  it("keeps legacy CLI open exports routed to v11 entrypoint", () => {
    expect(getBubbleOpenHelpText).toBe(getBubbleOpenHelpTextV11);
    expect(parseBubbleOpenCommandOptions).toBe(parseBubbleOpenCommandOptionsV11);
    expect(runBubbleOpenCommand).toBe(runBubbleOpenCommandV11);
  });
});
