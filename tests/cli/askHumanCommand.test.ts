import { describe, expect, it } from "vitest";

import {
  getAskHumanHelpText,
  parseAskHumanCommandOptions,
  runAskHumanCommand
} from "../../src/cli/commands/agent/askHuman.js";

describe("parseAskHumanCommandOptions", () => {
  it("parses question and refs", () => {
    const parsed = parseAskHumanCommandOptions([
      "--question",
      "Need decision",
      "--ref",
      "artifact://notes/1.md",
      "--ref",
      "artifact://notes/2.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated ask-human options");
    }

    expect(parsed.question).toBe("Need decision");
    expect(parsed.refs).toEqual([
      "artifact://notes/1.md",
      "artifact://notes/2.md"
    ]);
  });

  it("supports help", () => {
    const parsed = parseAskHumanCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getAskHumanHelpText()).toContain("pairflow ask-human");
  });

  it("requires --question", () => {
    expect(() => parseAskHumanCommandOptions([])).toThrow(/--question/u);
  });
});

describe("runAskHumanCommand", () => {
  it("returns null on help", async () => {
    const result = await runAskHumanCommand(["--help"]);
    expect(result).toBeNull();
  });
});
