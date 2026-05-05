import { describe, expect, it } from "vitest";

import {
  getBubbleCommitHelpText,
  parseBubbleCommitCommandOptions,
  runBubbleCommitCommand
} from "../../src/cli/commands/bubble/commit.js";

describe("parseBubbleCommitCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleCommitCommandOptions([
      "--id",
      "b_commit_01",
      "--repo",
      "/tmp/repo",
      "--message",
      "feat: finalize",
      "--stage-all",
      "--force",
      "--ref",
      ".pairflow/evidence/typecheck.log"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble commit options");
    }

    expect(parsed.id).toBe("b_commit_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.message).toBe("feat: finalize");
    expect(parsed.stageAll).toBe(true);
    expect(parsed.force).toBe(true);
    expect(parsed.refs).toEqual([".pairflow/evidence/typecheck.log"]);
  });

  it("rejects removed --auto with stage-all guidance", () => {
    expect(() =>
      parseBubbleCommitCommandOptions(["--id", "b_commit_01", "--auto"])
    ).toThrow(/COMMIT_AUTO_REMOVED:.*--stage-all/u);
  });

  it("rejects removed --no-auto with the same stage-all guidance", () => {
    expect(() =>
      parseBubbleCommitCommandOptions(["--id", "b_commit_01", "--no-auto"])
    ).toThrow(/COMMIT_AUTO_REMOVED:.*--stage-all/u);
  });

  it("supports help", () => {
    const parsed = parseBubbleCommitCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleCommitHelpText()).toContain("pairflow bubble commit");
    expect(getBubbleCommitHelpText()).toContain("--stage-all");
    expect(getBubbleCommitHelpText()).toContain("--force");
    expect(getBubbleCommitHelpText()).not.toContain("--auto");
    expect(getBubbleCommitHelpText()).not.toMatch(/done-package|auto-generate/u);
  });

  it("requires --id", () => {
    expect(() => parseBubbleCommitCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleCommitCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleCommitCommand(["--help"]);
    expect(result).toBeNull();
  });
});
