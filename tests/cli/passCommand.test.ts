import { describe, expect, it } from "vitest";

import {
  parsePassCommandOptions,
  runPassCommand
} from "../../src/cli/commands/agent/pass.js";

describe("parsePassCommandOptions", () => {
  it("parses summary, envelope refs, intent and finding-level refs", () => {
    const options = parsePassCommandOptions([
      "--summary",
      "handoff",
      "--ref",
      "artifact://diff/1.patch",
      "--ref",
      "artifact://tests/1.txt",
      "--intent",
      "review",
      "--finding",
      "P1:Missing test|artifact://review/failure.log,artifact://review/repro.md"
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
    expect(options.findings).toEqual([
      {
        severity: "P1",
        title: "Missing test",
        refs: [
          "artifact://review/failure.log",
          "artifact://review/repro.md"
        ]
      }
    ]);
  });

  it("keeps backward compatibility for findings without inline refs", () => {
    const options = parsePassCommandOptions([
      "--summary",
      "handoff",
      "--finding",
      "P2:Minor cleanup"
    ]);

    expect(options.help).toBe(false);
    if (options.help) {
      throw new Error("Expected validated pass options");
    }
    expect(options.findings).toEqual([
      {
        severity: "P2",
        title: "Minor cleanup"
      }
    ]);
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

  it("parses explicit no-findings flag", () => {
    const options = parsePassCommandOptions([
      "--summary",
      "review clean",
      "--no-findings"
    ]);

    expect(options.help).toBe(false);
    if (options.help) {
      throw new Error("Expected validated pass options");
    }
    expect(options.noFindings).toBe(true);
    expect(options.findings).toEqual([]);
  });

  it("rejects invalid finding format", () => {
    expect(() =>
      parsePassCommandOptions(["--summary", "handoff", "--finding", "bad-format"])
    ).toThrow(/Invalid --finding format/u);
  });

  it("rejects invalid finding refs format", () => {
    expect(() =>
      parsePassCommandOptions([
        "--summary",
        "handoff",
        "--finding",
        "P1:Missing test|artifact://ok,,artifact://also-ok"
      ])
    ).toThrow(/Invalid --finding refs/u);
  });

  it("rejects trailing finding refs separator with explicit message", () => {
    expect(() =>
      parsePassCommandOptions([
        "--summary",
        "handoff",
        "--finding",
        "P1:Missing test|"
      ])
    ).toThrow(/trailing `\|` without refs/u);
  });

  it("supports escaped commas inside a single finding ref", () => {
    const options = parsePassCommandOptions([
      "--summary",
      "handoff",
      "--finding",
      "P1:Missing test|artifact://review/failure\\,segment.log"
    ]);

    expect(options.help).toBe(false);
    if (options.help) {
      throw new Error("Expected validated pass options");
    }
    expect(options.findings).toEqual([
      {
        severity: "P1",
        title: "Missing test",
        refs: ["artifact://review/failure,segment.log"]
      }
    ]);
  });

  it("rejects ambiguous comma-split refs that are not structured paths or URIs", () => {
    expect(() =>
      parsePassCommandOptions([
        "--summary",
        "handoff",
        "--finding",
        "P1:Missing test|artifact://review/failure.log,segment.log"
      ])
    ).toThrow(/single ref contains a comma/u);
  });
});

describe("runPassCommand", () => {
  it("returns null on help", async () => {
    const result = await runPassCommand(["--help"]);
    expect(result).toBeNull();
  });
});
