import { describe, expect, it } from "vitest";

import {
  getConvergedHelpText,
  parseConvergedCommandOptions,
  runConvergedCommand
} from "../../src/cli/commands/agent/converged.js";

describe("parseConvergedCommandOptions", () => {
  it("parses summary and refs", () => {
    const parsed = parseConvergedCommandOptions([
      "--summary",
      "No blocking findings remain.",
      "--ref",
      "artifact://done-package.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated converged options");
    }

    expect(parsed.summary).toBe("No blocking findings remain.");
    expect(parsed.refs).toEqual(["artifact://done-package.md"]);
  });

  it("supports help", () => {
    const parsed = parseConvergedCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getConvergedHelpText()).toContain("pairflow converged");
  });

  it("requires --summary", () => {
    expect(() => parseConvergedCommandOptions([])).toThrow(/--summary/u);
  });
});

describe("runConvergedCommand", () => {
  it("returns null on help", async () => {
    const result = await runConvergedCommand(["--help"]);
    expect(result).toBeNull();
  });
});
