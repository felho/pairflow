import { describe, expect, it } from "vitest";

import {
  getBubbleInboxHelpText,
  parseBubbleInboxCommandOptions,
  runBubbleInboxCommand
} from "../../src/cli/commands/bubble/inbox.js";

describe("parseBubbleInboxCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleInboxCommandOptions([
      "--id",
      "b_inbox_01",
      "--repo",
      "/tmp/repo",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble inbox options");
    }

    expect(parsed.id).toBe("b_inbox_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleInboxCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleInboxHelpText()).toContain("pairflow bubble inbox");
  });

  it("requires --id", () => {
    expect(() => parseBubbleInboxCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleInboxCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleInboxCommand(["--help"]);
    expect(result).toBeNull();
  });
});
