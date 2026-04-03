import { afterEach, describe, expect, it, vi } from "vitest";

import { PassCommandErrorV11 } from "../../src/v11/application/pass/emitPassV11.js";
import * as actorEmitContextModule from "../../src/core/bubble/actorEmitContext.js";
import * as actorProtocolModule from "../../src/v11/application/actorProtocol/emitActorProtocolV11.js";
import {
  getPassHelpText,
  parsePassCommandOptions,
  runPassCommand
} from "../../src/cli/commands/agent/pass.js";

afterEach(() => {
  vi.restoreAllMocks();
});

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
        priority: "P1",
        severity: "P1",
        title: "Missing test",
        timing: "later-hardening",
        layer: "L1",
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
        priority: "P2",
        severity: "P2",
        title: "Minor cleanup",
        timing: "later-hardening",
        layer: "L1"
      }
    ]);
  });

  it("rejects invalid intent", () => {
    expect(() =>
      parsePassCommandOptions(["--summary", "handoff", "--intent", "unknown"])
    ).toThrow(/PASS_OPTIONS_INVALID/u);
    expect(() =>
      parsePassCommandOptions(["--summary", "handoff", "--intent", "unknown"])
    ).toThrow(/Invalid --intent value/u);
  });

  it("requires summary unless help is requested", () => {
    expect(() => parsePassCommandOptions([])).toThrow(/PASS_OPTIONS_INVALID/u);
    expect(() => parsePassCommandOptions([])).toThrow(/Missing required option/u);

    const helpOptions = parsePassCommandOptions(["--help"]);
    expect(helpOptions.help).toBe(true);
  });

  it("wraps strict parse option errors with PASS_OPTIONS_INVALID reason code", () => {
    expect(() =>
      parsePassCommandOptions(["--summary", "handoff", "--bogus", "x"])
    ).toThrow(/PASS_OPTIONS_INVALID/u);
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
    ).toThrow(/PASS_FINDINGS_INVALID: Invalid --finding format/u);
  });

  it("rejects invalid finding refs format", () => {
    expect(() =>
      parsePassCommandOptions([
        "--summary",
        "handoff",
        "--finding",
        "P1:Missing test|artifact://ok,,artifact://also-ok"
      ])
    ).toThrow(/PASS_FINDINGS_INVALID: Invalid --finding refs/u);
  });

  it("rejects trailing finding refs separator with explicit message", () => {
    expect(() =>
      parsePassCommandOptions([
        "--summary",
        "handoff",
        "--finding",
        "P1:Missing test|"
      ])
    ).toThrow(/PASS_FINDINGS_INVALID: Invalid --finding refs: trailing `\|` without refs/u);
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
        priority: "P1",
        severity: "P1",
        title: "Missing test",
        timing: "later-hardening",
        layer: "L1",
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
    ).toThrow(/PASS_FINDINGS_INVALID: Invalid --finding refs/u);
  });

  it("returns help even when malformed finding is present", () => {
    const options = parsePassCommandOptions([
      "--help",
      "--finding",
      "bad-format"
    ]);

    expect(options.help).toBe(true);
  });

  it("documents doc-scope blocker qualifier limits in help text", () => {
    const help = getPassHelpText();
    expect(help).toContain("pairflow agent emit --kind pass");
    expect(help).toContain(
      "Single ref accepts any non-empty token; multi-ref requires structured path/URI refs."
    );
    expect(help).toContain("Shorthand defaults: timing=later-hardening, layer=L1");
    expect(help).toContain("cannot encode explicit `timing`/`layer` values");
  });
});

describe("runPassCommand", () => {
  it("returns null on help", async () => {
    const result = await runPassCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("fails closed with removal guidance instead of invoking the legacy pass flow", async () => {
    const resolveSpy = vi.spyOn(
      actorEmitContextModule,
      "resolveCompatActorEmitContextFromWorkspace"
    );
    const emitSpy = vi.spyOn(
      actorProtocolModule,
      "emitActorProtocolFromWorkspaceV11"
    );

    expect(() =>
      runPassCommand(
        ["--summary", "handoff complete"],
        "/tmp/pairflow-repo"
      )
    ).toThrowError(PassCommandErrorV11);
    expect(() =>
      runPassCommand(
        ["--summary", "handoff complete"],
        "/tmp/pairflow-repo"
      )
    ).toThrow(/LEGACY_COMMAND_REMOVED/u);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("fails closed with removal guidance even when legacy args are missing or malformed", async () => {
    for (const args of [
      [],
      ["--summary", "handoff", "--finding", "bad-format"],
      ["--summary", "handoff", "--intent", "unknown"]
    ]) {
      expect(() => runPassCommand(args, "/tmp/pairflow-repo")).toThrowError(
        PassCommandErrorV11
      );
      expect(() => runPassCommand(args, "/tmp/pairflow-repo")).toThrow(
        /LEGACY_COMMAND_REMOVED/u
      );
    }
  });
});
