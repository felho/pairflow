import { describe, expect, it } from "vitest";

import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusTable,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "../../../../src/cli/commands/bubble/status.js";
import {
  getBubbleStatusHelpText as getBubbleStatusHelpTextV11,
  parseBubbleStatusCommandOptions as parseBubbleStatusCommandOptionsV11,
  renderBubbleStatusTable as renderBubbleStatusTableV11,
  renderBubbleStatusText as renderBubbleStatusTextV11,
  runBubbleStatusCommand as runBubbleStatusCommandV11
} from "../../../../src/v11/application/status/statusCliCommand.js";

describe("status CLI entrypoint parity", () => {
  it("keeps legacy CLI status exports routed to v11 entrypoint", () => {
    expect(getBubbleStatusHelpText).toBe(getBubbleStatusHelpTextV11);
    expect(parseBubbleStatusCommandOptions).toBe(parseBubbleStatusCommandOptionsV11);
    expect(renderBubbleStatusTable).toBe(renderBubbleStatusTableV11);
    expect(renderBubbleStatusText).toBe(renderBubbleStatusTextV11);
    expect(runBubbleStatusCommand).toBe(runBubbleStatusCommandV11);
  });
});
