import { describe, expect, it } from "vitest";

import {
  getBubbleListHelpText,
  parseBubbleListCommandOptions,
  runBubbleListCommand
} from "../../src/cli/commands/bubble/list.js";

describe("parseBubbleListCommandOptions", () => {
  it("parses optional flags", () => {
    const parsed = parseBubbleListCommandOptions(["--repo", "/tmp/repo", "--json"]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble list options");
    }

    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleListCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleListHelpText()).toContain("pairflow bubble list");
  });
});

describe("runBubbleListCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleListCommand(["--help"]);
    expect(result).toBeNull();
  });
});
