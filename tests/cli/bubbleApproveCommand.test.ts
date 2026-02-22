import { describe, expect, it } from "vitest";

import {
  getBubbleApproveHelpText,
  parseBubbleApproveCommandOptions,
  runBubbleApproveCommand
} from "../../src/cli/commands/bubble/approve.js";

describe("parseBubbleApproveCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleApproveCommandOptions([
      "--id",
      "b_approve_01",
      "--repo",
      "/tmp/repo",
      "--ref",
      "artifact://done-package.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble approve options");
    }

    expect(parsed.id).toBe("b_approve_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.refs).toEqual(["artifact://done-package.md"]);
  });

  it("supports help", () => {
    const parsed = parseBubbleApproveCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleApproveHelpText()).toContain("pairflow bubble approve");
  });

  it("requires --id", () => {
    expect(() => parseBubbleApproveCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleApproveCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleApproveCommand(["--help"]);
    expect(result).toBeNull();
  });
});
