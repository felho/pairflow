import { describe, expect, it } from "vitest";

import {
  getBubbleMergeHelpText,
  parseBubbleMergeCommandOptions,
  runBubbleMergeCommand
} from "../../src/cli/commands/bubble/merge.js";

describe("parseBubbleMergeCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleMergeCommandOptions([
      "--id",
      "b_merge_01",
      "--repo",
      "/tmp/repo",
      "--push",
      "--delete-remote"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble merge options");
    }

    expect(parsed.id).toBe("b_merge_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.push).toBe(true);
    expect(parsed["delete-remote"]).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleMergeCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleMergeHelpText()).toContain("pairflow bubble merge");
  });

  it("requires --id", () => {
    expect(() => parseBubbleMergeCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleMergeCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleMergeCommand(["--help"]);
    expect(result).toBeNull();
  });
});
