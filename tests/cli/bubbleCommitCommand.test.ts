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
      "--ref",
      "artifact://done-package.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble commit options");
    }

    expect(parsed.id).toBe("b_commit_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.message).toBe("feat: finalize");
    expect(parsed.refs).toEqual(["artifact://done-package.md"]);
  });

  it("supports help", () => {
    const parsed = parseBubbleCommitCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleCommitHelpText()).toContain("pairflow bubble commit");
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
