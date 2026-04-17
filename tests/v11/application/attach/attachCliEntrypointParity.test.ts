import { describe, expect, it } from "vitest";

import {
  getBubbleAttachHelpText,
  parseBubbleAttachCommandOptions,
  runBubbleAttachCommand
} from "../../../../src/cli/commands/bubble/attach.js";
import {
  getBubbleAttachHelpText as getBubbleAttachHelpTextV11,
  parseBubbleAttachCommandOptions as parseBubbleAttachCommandOptionsV11,
  runBubbleAttachCommand as runBubbleAttachCommandV11
} from "../../../../src/v11/application/attach/attachCliCommand.js";

describe("attach CLI entrypoint parity", () => {
  it("keeps legacy CLI attach exports routed to v11 entrypoint", () => {
    expect(getBubbleAttachHelpText).toBe(getBubbleAttachHelpTextV11);
    expect(parseBubbleAttachCommandOptions).toBe(
      parseBubbleAttachCommandOptionsV11
    );
    expect(runBubbleAttachCommand).toBe(runBubbleAttachCommandV11);
  });
});
