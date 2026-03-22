import { describe, expect, it } from "vitest";

import {
  CliFindingParseError,
  parseCliFinding
} from "../../src/cli/commands/agent/shared/findingParser.js";
import { normalizeConvergedCommandInput } from "../../src/v11/shared/converged/convergedCommandInputNormalization.js";

class SyntheticConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticConvergedCommandError";
  }
}

describe("parseCliFinding", () => {
  it("parses finding without refs", () => {
    expect(parseCliFinding("P2:Follow-up")).toEqual({
      severity: "P2",
      title: "Follow-up"
    });
  });

  it("keeps trailing backslash in single ref", () => {
    expect(parseCliFinding("P2:Follow-up|artifact://review/path\\")).toEqual({
      severity: "P2",
      title: "Follow-up",
      refs: ["artifact://review/path\\"]
    });
  });

  it("rejects trailing-colon input", () => {
    expect(() => parseCliFinding("P2:")).toThrow(CliFindingParseError);
    expect(() => parseCliFinding("P2:")).toThrow(/Invalid --finding format/u);
  });

  it("rejects trailing refs separator without refs", () => {
    expect(() => parseCliFinding("P2:Follow-up|")).toThrow(CliFindingParseError);
    expect(() => parseCliFinding("P2:Follow-up|")).toThrow(
      /trailing `\|` without refs/u
    );
  });

  it("rejects empty ref token in comma-separated refs list", () => {
    expect(() =>
      parseCliFinding("P2:Follow-up|artifact://review/a.md,,artifact://review/b.md")
    ).toThrow(CliFindingParseError);
    expect(() =>
      parseCliFinding("P2:Follow-up|artifact://review/a.md,,artifact://review/b.md")
    ).toThrow(/Refs must be non-empty comma-separated values/u);
  });

  it("rejects invalid severity", () => {
    expect(() => parseCliFinding("P4:Follow-up")).toThrow(CliFindingParseError);
    expect(() => parseCliFinding("P4:Follow-up")).toThrow(
      /Invalid --finding severity/u
    );
  });

  it("rejects ambiguous multi-ref input that mixes structured and unstructured refs", () => {
    expect(() =>
      parseCliFinding("P2:Follow-up|artifact://review/a.md,notes.txt")
    ).toThrow(CliFindingParseError);
    expect(() =>
      parseCliFinding("P2:Follow-up|artifact://review/a.md,notes.txt")
    ).toThrow(/multiple refs must each be path-like/iu);
  });

  it("parses multiple structured refs in stable order", () => {
    expect(
      parseCliFinding("P2:Follow-up|artifact://review/a.md,./notes/repro.md,/tmp/log.txt")
    ).toEqual({
      severity: "P2",
      title: "Follow-up",
      refs: ["artifact://review/a.md", "./notes/repro.md", "/tmp/log.txt"]
    });
  });

  it("allows non-structured single ref tokens", () => {
    expect(parseCliFinding("P2:Follow-up|notes-token")).toEqual({
      severity: "P2",
      title: "Follow-up",
      refs: ["notes-token"]
    });
  });

  it("rejects empty title before refs separator", () => {
    expect(() => parseCliFinding("P2: |artifact://review/a.md")).toThrow(
      CliFindingParseError
    );
    expect(() => parseCliFinding("P2: |artifact://review/a.md")).toThrow(
      /Invalid --finding title/u
    );
  });

  it("keeps CLI parser and converged normalization parity for structured multi-ref classes", () => {
    const cases = [
      {
        rawFinding: "P2:Follow-up|artifact://review/a.md,./notes/repro.md,/tmp/log.txt",
        normalizationRefs: ["artifact://review/a.md", "./notes/repro.md", "/tmp/log.txt"],
        expectedAccepted: true
      },
      {
        rawFinding: "P2:Follow-up|artifact://review/a.md,notes-token",
        normalizationRefs: ["artifact://review/a.md", "notes-token"],
        expectedAccepted: false
      },
      {
        rawFinding: "P2:Follow-up|notes-token,notes-token",
        normalizationRefs: ["notes-token", "notes-token"],
        expectedAccepted: false
      },
      {
        rawFinding: "P2:Follow-up|artifact://review/a.md,,artifact://review/b.md",
        normalizationRefs: ["artifact://review/a.md", " ", "artifact://review/b.md"],
        expectedAccepted: false
      },
      {
        rawFinding: "P2:Follow-up|artifact://review/a.md,artifact://review/a.md",
        normalizationRefs: ["artifact://review/a.md", "artifact://review/a.md"],
        expectedAccepted: true
      },
      {
        rawFinding: "P2:Follow-up|notes-token",
        normalizationRefs: ["notes-token"],
        expectedAccepted: true
      }
    ] as const;

    for (const fixture of cases) {
      const cliAccepted = (() => {
        try {
          parseCliFinding(fixture.rawFinding);
          return true;
        } catch {
          return false;
        }
      })();

      const normalizationAccepted = (() => {
        try {
          normalizeConvergedCommandInput({
            summary: "ready",
            findings: [
              {
                severity: "P2",
                title: "follow-up",
                refs: [...fixture.normalizationRefs]
              }
            ],
            createError: (message) => new SyntheticConvergedCommandError(message)
          });
          return true;
        } catch {
          return false;
        }
      })();

      expect(cliAccepted).toBe(fixture.expectedAccepted);
      expect(normalizationAccepted).toBe(fixture.expectedAccepted);
      expect(cliAccepted).toBe(normalizationAccepted);
    }
  });
});
