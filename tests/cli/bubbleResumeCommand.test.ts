import { describe, expect, it } from "vitest";

import {
  getBubbleResumeHelpText,
  parseBubbleResumeCommandOptions,
  runBubbleResumeCommand
} from "../../src/cli/commands/bubble/resume.js";

describe("parseBubbleResumeCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleResumeCommandOptions([
      "--id",
      "b_resume_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble resume options");
    }

    expect(parsed.id).toBe("b_resume_01");
    expect(parsed.repo).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseBubbleResumeCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleResumeHelpText()).toContain("pairflow bubble resume");
  });

  it("requires --id", () => {
    expect(() => parseBubbleResumeCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleResumeCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleResumeCommand(["--help"]);
    expect(result).toBeNull();
  });
});
