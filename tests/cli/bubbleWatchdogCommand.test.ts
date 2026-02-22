import { describe, expect, it } from "vitest";

import {
  getBubbleWatchdogHelpText,
  parseBubbleWatchdogCommandOptions,
  runBubbleWatchdogCommand
} from "../../src/cli/commands/bubble/watchdog.js";

describe("parseBubbleWatchdogCommandOptions", () => {
  it("parses required and optional flags", () => {
    const parsed = parseBubbleWatchdogCommandOptions([
      "--id",
      "b_watchdog_cmd_01",
      "--repo",
      "/tmp/repo",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble watchdog options");
    }

    expect(parsed.id).toBe("b_watchdog_cmd_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleWatchdogCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleWatchdogHelpText()).toContain("pairflow bubble watchdog");
  });

  it("requires --id", () => {
    expect(() => parseBubbleWatchdogCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleWatchdogCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleWatchdogCommand(["--help"]);
    expect(result).toBeNull();
  });
});
