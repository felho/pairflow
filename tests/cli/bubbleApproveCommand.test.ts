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
    expect(parsed.overrideNonApprove).toBe(false);
  });

  it("parses explicit override options", () => {
    const parsed = parseBubbleApproveCommandOptions([
      "--id",
      "b_approve_02",
      "--override-non-approve",
      "--override-reason",
      "Human override for inconclusive recommendation"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble approve options");
    }
    expect(parsed.overrideNonApprove).toBe(true);
    expect(parsed.overrideReason).toBe(
      "Human override for inconclusive recommendation"
    );
  });

  it("supports help", () => {
    const parsed = parseBubbleApproveCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleApproveHelpText()).toContain("pairflow bubble approve");
    expect(getBubbleApproveHelpText()).toContain("READY_FOR_HUMAN_APPROVAL");
    expect(getBubbleApproveHelpText()).toContain("--override-non-approve");
    expect(getBubbleApproveHelpText()).toContain("--override-reason");
  });

  it("requires --id", () => {
    expect(() => parseBubbleApproveCommandOptions([])).toThrow(/--id/u);
  });

  it("rejects whitespace-only override reason", () => {
    expect(() =>
      parseBubbleApproveCommandOptions([
        "--id",
        "b_approve_03",
        "--override-reason",
        "   "
      ])
    ).toThrow(/APPROVAL_OVERRIDE_REASON_REQUIRED/u);
  });
});

describe("runBubbleApproveCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleApproveCommand(["--help"]);
    expect(result).toBeNull();
  });
});
