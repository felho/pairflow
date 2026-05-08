import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConvergedCommandError
} from "../../src/v11/application/converged/convergedCommandOrchestration.js";
import * as actorEmitContextModule from "../../src/v11/shared/actorProtocol/actorEmitContext.js";
import * as actorProtocolModule from "../../src/v11/application/actorProtocol/emitActorProtocolV11.js";
import { parsePassCommandOptions } from "../../src/cli/commands/agent/pass.js";
import {
  getConvergedHelpText,
  parseConvergedCommandOptions,
  runConvergedCommand
} from "../../src/cli/commands/agent/converged.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const PARSER_PARITY_FIXTURES = [
  // Intentional policy scope: converged accepts only P2/P3 in structured mode.
  // P0/P1 coverage lives in the dedicated rejection test below.
  "P2:Non-blocking issue",
  "P3:Minor follow-up|artifact://review/notes.md",
  "P2:Escaped comma ref|artifact://review/with\\,comma.log"
] as const;

describe("parseConvergedCommandOptions", () => {
  it("parses summary, refs, and findings", () => {
    const parsed = parseConvergedCommandOptions([
      "--summary",
      "No blocking findings remain.",
      "--ref",
      "artifact://done-package.md",
      "--finding",
      "P2:Non-blocking follow-up|artifact://review/findings.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated converged options");
    }

    expect(parsed.summary).toBe("No blocking findings remain.");
    expect(parsed.refs).toEqual(["artifact://done-package.md"]);
    expect(parsed.findings).toEqual([
      {
        severity: "P2",
        title: "Non-blocking follow-up",
        refs: ["artifact://review/findings.md"]
      }
    ]);
  });

  it("supports help", () => {
    const parsed = parseConvergedCommandOptions(["--help"]);
    const help = getConvergedHelpText();
    expect(parsed.help).toBe(true);
    expect(help).toContain("pairflow agent emit --kind convergence");
    expect(help).toContain("--execution-id <id>");
    expect(help).toContain("Removed legacy alias:");
    expect(help).toContain("pairflow converged");
    expect(help).toContain("CONVERGED_BLOCKER_FINDINGS_FORBIDDEN");
    expect(help).toContain(
      "Single ref accepts any non-empty token; multi-ref requires structured path/URI refs."
    );
    expect(help).toContain("P2|P3:Title[|ref1,ref2]");
    expect(help).not.toContain("P0|P1|P2|P3:Title[|ref1,ref2]");
  });

  it("returns help even when malformed finding is present", () => {
    const parsed = parseConvergedCommandOptions([
      "--help",
      "--finding",
      "bad-format"
    ]);

    expect(parsed.help).toBe(true);
  });

  it("requires --summary", () => {
    expect(() => parseConvergedCommandOptions([])).toThrow(
      /CONVERGED_OPTIONS_INVALID/u
    );
    expect(() => parseConvergedCommandOptions([])).toThrow(/--summary/u);
  });

  it("keeps parser parity with pass for P2/P3 fixtures", () => {
    for (const fixture of PARSER_PARITY_FIXTURES) {
      const passParsed = parsePassCommandOptions([
        "--summary",
        "review",
        "--finding",
        fixture
      ]);
      const convergedParsed = parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        fixture
      ]);
      if (passParsed.help || convergedParsed.help) {
        throw new Error("Expected non-help parse result.");
      }
      expect(
        passParsed.findings.map((finding) => ({
          severity: finding.severity,
          title: finding.title,
          ...(finding.refs !== undefined ? { refs: finding.refs } : {})
        }))
      ).toEqual(convergedParsed.findings);
    }
  });

  it("rejects invalid finding format with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "not-a-finding"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects empty ref token in finding refs with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "P2:Follow-up|artifact://review/a.md,,artifact://review/b.md"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects ambiguous multi-ref finding refs with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "P2:Follow-up|artifact://review/a.md,notes-token"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects empty title before refs separator with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "P2: |artifact://review/a.md"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects P0 and P1 findings in converged context", () => {
    for (const finding of ["P0:Critical blocker", "P1:Blocker"]) {
      expect(() =>
        parseConvergedCommandOptions([
          "--summary",
          "ready",
          "--finding",
          finding
        ])
      ).toThrow(/CONVERGED_BLOCKER_FINDINGS_FORBIDDEN/u);
    }
  });

  it("rejects when summary asserts open findings but structured findings are missing", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "P2 findings remain open after checks."
      ])
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });

  it("rejects when summary declares clean state while structured findings are present", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "No findings remain.",
        "--finding",
        "P2:Still open"
      ])
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });

  it("accepts resolved-count summary phrasing when structured findings are present", () => {
    const parsed = parseConvergedCommandOptions([
      "--summary",
      "2 findings were resolved.",
      "--finding",
      "P2:Follow-up validation remains"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated converged options");
    }
    expect(parsed.findings).toEqual([
      {
        severity: "P2",
        title: "Follow-up validation remains"
      }
    ]);
  });

  it("rejects clean severity-scoped summary assertions when structured findings are present", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "No open P2 or P3 findings remain.",
        "--finding",
        "P2:Still open"
      ])
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });
});

describe("runConvergedCommand", () => {
  it("returns null on help", async () => {
    const result = await runConvergedCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("fails closed with removal guidance instead of invoking the legacy converged flow", async () => {
    const resolveSpy = vi.spyOn(
      actorEmitContextModule,
      "resolveCompatActorEmitContextFromWorkspace"
    );
    const emitSpy = vi.spyOn(
      actorProtocolModule,
      "emitActorProtocolFromWorkspaceV11"
    );

    expect(() =>
      runConvergedCommand(
        ["--summary", "Ready for approval."],
        "/tmp/pairflow-repo"
      )
    ).toThrow(/LEGACY_COMMAND_REMOVED/u);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("fails closed with removal guidance even when legacy args are missing or malformed", async () => {
    for (const args of [
      [],
      ["--summary", "ready", "--finding", "bad-format"]
    ]) {
      expect(() => runConvergedCommand(args, "/tmp/pairflow-repo")).toThrowError(
        ConvergedCommandError
      );
      expect(() => runConvergedCommand(args, "/tmp/pairflow-repo")).toThrow(
        /LEGACY_COMMAND_REMOVED/u
      );
    }
  });
});
