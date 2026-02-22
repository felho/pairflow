import { describe, expect, it } from "vitest";

import {
  getBubbleStopHelpText,
  parseBubbleStopCommandOptions,
  runBubbleStopCommand
} from "../../src/cli/commands/bubble/stop.js";

describe("parseBubbleStopCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleStopCommandOptions([
      "--id",
      "b_stop_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble stop options");
    }

    expect(parsed.id).toBe("b_stop_01");
    expect(parsed.repo).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseBubbleStopCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleStopHelpText()).toContain("pairflow bubble stop");
  });

  it("requires --id", () => {
    expect(() => parseBubbleStopCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleStopCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleStopCommand(["--help"]);
    expect(result).toBeNull();
  });
});
