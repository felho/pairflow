import { describe, expect, it } from "vitest";

import {
  parsePassCommandOptions,
  runPassCommand
} from "../../src/cli/commands/agent/pass.js";

describe("parsePassCommandOptions", () => {
  it("parses summary, refs and intent", () => {
    const options = parsePassCommandOptions([
      "--summary",
      "handoff",
      "--ref",
      "artifact://diff/1.patch",
      "--ref",
      "artifact://tests/1.txt",
      "--intent",
      "review"
    ]);

    expect(options.help).toBe(false);
    if (options.help) {
      throw new Error("Expected validated pass options");
    }
    expect(options.summary).toBe("handoff");
    expect(options.refs).toEqual([
      "artifact://diff/1.patch",
      "artifact://tests/1.txt"
    ]);
    expect(options.intent).toBe("review");
  });

  it("rejects invalid intent", () => {
    expect(() =>
      parsePassCommandOptions(["--summary", "handoff", "--intent", "unknown"])
    ).toThrow(/Invalid --intent value/u);
  });

  it("requires summary unless help is requested", () => {
    expect(() => parsePassCommandOptions([])).toThrow(/Missing required option/u);

    const helpOptions = parsePassCommandOptions(["--help"]);
    expect(helpOptions.help).toBe(true);
  });
});

describe("runPassCommand", () => {
  it("returns null on help", async () => {
    const result = await runPassCommand(["--help"]);
    expect(result).toBeNull();
  });
});
