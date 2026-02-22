import { describe, expect, it } from "vitest";

import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  runBubbleStatusCommand
} from "../../src/cli/commands/bubble/status.js";

describe("parseBubbleStatusCommandOptions", () => {
  it("parses required and optional flags", () => {
    const parsed = parseBubbleStatusCommandOptions([
      "--id",
      "b_status_01",
      "--repo",
      "/tmp/repo",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble status options");
    }

    expect(parsed.id).toBe("b_status_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleStatusCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleStatusHelpText()).toContain("pairflow bubble status");
  });

  it("requires --id", () => {
    expect(() => parseBubbleStatusCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleStatusCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleStatusCommand(["--help"]);
    expect(result).toBeNull();
  });
});
