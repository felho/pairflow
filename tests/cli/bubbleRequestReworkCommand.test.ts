import { describe, expect, it } from "vitest";

import {
  getBubbleRequestReworkHelpText,
  parseBubbleRequestReworkCommandOptions,
  runBubbleRequestReworkCommand
} from "../../src/cli/commands/bubble/requestRework.js";

describe("parseBubbleRequestReworkCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleRequestReworkCommandOptions([
      "--id",
      "b_rework_01",
      "--message",
      "Please tighten validation on edge cases.",
      "--repo",
      "/tmp/repo",
      "--ref",
      "artifact://review-notes.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble request-rework options");
    }

    expect(parsed.id).toBe("b_rework_01");
    expect(parsed.message).toBe("Please tighten validation on edge cases.");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.refs).toEqual(["artifact://review-notes.md"]);
  });

  it("supports help", () => {
    const parsed = parseBubbleRequestReworkCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleRequestReworkHelpText()).toContain(
      "pairflow bubble request-rework"
    );
  });

  it("requires --id and --message", () => {
    expect(() => parseBubbleRequestReworkCommandOptions([])).toThrow(
      /--id, --message/u
    );
    expect(() =>
      parseBubbleRequestReworkCommandOptions(["--id", "b_rework_01"])
    ).toThrow(/--message/u);
  });
});

describe("runBubbleRequestReworkCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleRequestReworkCommand(["--help"]);
    expect(result).toBeNull();
  });
});
