import { describe, expect, it } from "vitest";

import {
  getBubbleCommitHelpText,
  parseBubbleCommitCommandOptions,
  runBubbleCommitCommand
} from "../../../../src/cli/commands/bubble/commit.js";
import {
  getBubbleCommitHelpText as getBubbleCommitHelpTextV11,
  parseBubbleCommitCommandOptions as parseBubbleCommitCommandOptionsV11,
  runBubbleCommitCommand as runBubbleCommitCommandV11
} from "../../../../src/v11/application/commit/commitCliCommand.js";

describe("commit CLI entrypoint parity", () => {
  it("keeps legacy CLI commit exports routed to v11 entrypoint", () => {
    expect(getBubbleCommitHelpText).toBe(getBubbleCommitHelpTextV11);
    expect(parseBubbleCommitCommandOptions).toBe(
      parseBubbleCommitCommandOptionsV11
    );
    expect(runBubbleCommitCommand).toBe(runBubbleCommitCommandV11);
  });
});
