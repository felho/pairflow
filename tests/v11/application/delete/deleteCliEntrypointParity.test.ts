import { describe, expect, it } from "vitest";

import {
  getBubbleDeleteHelpText,
  parseBubbleDeleteCommandOptions,
  runBubbleDeleteCommand
} from "../../../../src/cli/commands/bubble/delete.js";
import {
  getBubbleDeleteHelpText as getBubbleDeleteHelpTextV11,
  parseBubbleDeleteCommandOptions as parseBubbleDeleteCommandOptionsV11,
  runBubbleDeleteCommand as runBubbleDeleteCommandV11
} from "../../../../src/v11/application/delete/deleteCliCommand.js";

describe("delete CLI entrypoint parity", () => {
  it("keeps legacy CLI delete exports routed to v11 entrypoint", () => {
    expect(getBubbleDeleteHelpText).toBe(getBubbleDeleteHelpTextV11);
    expect(parseBubbleDeleteCommandOptions).toBe(
      parseBubbleDeleteCommandOptionsV11
    );
    expect(runBubbleDeleteCommand).toBe(runBubbleDeleteCommandV11);
  });
});
