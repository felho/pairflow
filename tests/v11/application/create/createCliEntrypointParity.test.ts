import { describe, expect, it } from "vitest";

import {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions,
  runBubbleCreateCommand
} from "../../../../src/cli/commands/bubble/create.js";
import {
  getBubbleCreateHelpText as getBubbleCreateHelpTextV11,
  parseBubbleCreateCommandOptions as parseBubbleCreateCommandOptionsV11,
  runBubbleCreateCommand as runBubbleCreateCommandV11
} from "../../../../src/v11/application/create/createCliCommand.js";

describe("create CLI entrypoint parity", () => {
  it("keeps legacy CLI create exports routed to v11 entrypoint", () => {
    expect(getBubbleCreateHelpText).toBe(getBubbleCreateHelpTextV11);
    expect(parseBubbleCreateCommandOptions).toBe(
      parseBubbleCreateCommandOptionsV11
    );
    expect(runBubbleCreateCommand).toBe(runBubbleCreateCommandV11);
  });
});
