import { describe, expect, it } from "vitest";

import {
  getBubbleKickoffHelpText,
  parseBubbleKickoffCommandOptions,
  runBubbleKickoffCommand
} from "../../../../src/cli/commands/bubble/kickoff.js";
import {
  getBubbleKickoffHelpText as getBubbleKickoffHelpTextV11,
  parseBubbleKickoffCommandOptions as parseBubbleKickoffCommandOptionsV11,
  runBubbleKickoffCommand as runBubbleKickoffCommandV11
} from "../../../../src/v11/application/kickoff/kickoffCliCommand.js";

describe("kickoff CLI entrypoint parity", () => {
  it("keeps legacy CLI kickoff exports routed to v11 entrypoint", () => {
    expect(getBubbleKickoffHelpText).toBe(getBubbleKickoffHelpTextV11);
    expect(parseBubbleKickoffCommandOptions).toBe(
      parseBubbleKickoffCommandOptionsV11
    );
    expect(runBubbleKickoffCommand).toBe(runBubbleKickoffCommandV11);
  });
});
