import { describe, expect, it } from "vitest";

import {
  getBubbleRestartHelpText,
  parseBubbleRestartCommandOptions,
  runBubbleRestartCommand
} from "../../../../src/cli/commands/bubble/restart.js";
import {
  getBubbleRestartHelpText as getBubbleRestartHelpTextV11,
  parseBubbleRestartCommandOptions as parseBubbleRestartCommandOptionsV11,
  runBubbleRestartCommand as runBubbleRestartCommandV11
} from "../../../../src/v11/application/restart/restartCliCommand.js";

describe("restart CLI entrypoint parity", () => {
  it("keeps legacy CLI restart exports routed to v11 entrypoint", () => {
    expect(getBubbleRestartHelpText).toBe(getBubbleRestartHelpTextV11);
    expect(parseBubbleRestartCommandOptions).toBe(
      parseBubbleRestartCommandOptionsV11
    );
    expect(runBubbleRestartCommand).toBe(runBubbleRestartCommandV11);
  });
});
