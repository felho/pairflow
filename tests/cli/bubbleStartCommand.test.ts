import { describe, expect, it } from "vitest";

import {
  getBubbleStartHelpText,
  parseBubbleStartCommandOptions,
  runBubbleStartCommand
} from "../../src/cli/commands/bubble/start.js";

describe("parseBubbleStartCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleStartCommandOptions([
      "--id",
      "b_start_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble start options");
    }

    expect(parsed.id).toBe("b_start_01");
    expect(parsed.repo).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseBubbleStartCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleStartHelpText()).toContain("pairflow bubble start");
  });

  it("requires --id", () => {
    expect(() => parseBubbleStartCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleStartCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleStartCommand(["--help"]);
    expect(result).toBeNull();
  });
});
