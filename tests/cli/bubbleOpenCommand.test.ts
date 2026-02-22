import { describe, expect, it } from "vitest";

import {
  getBubbleOpenHelpText,
  parseBubbleOpenCommandOptions,
  runBubbleOpenCommand
} from "../../src/cli/commands/bubble/open.js";

describe("parseBubbleOpenCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleOpenCommandOptions([
      "--id",
      "b_open_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble open options");
    }

    expect(parsed.id).toBe("b_open_01");
    expect(parsed.repo).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseBubbleOpenCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleOpenHelpText()).toContain("pairflow bubble open");
  });

  it("requires --id", () => {
    expect(() => parseBubbleOpenCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleOpenCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleOpenCommand(["--help"]);
    expect(result).toBeNull();
  });
});
