import { describe, expect, it } from "vitest";

import { normalizeConvergedCommandInput } from "../../../../src/v11/shared/converged/convergedCommandInputNormalization.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

class SyntheticConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticConvergedCommandError";
  }
}

describe("convergedCommandInputNormalization", () => {
  it("normalizes summary and refs while preserving provided now value", () => {
    const now = new Date("2026-03-19T21:05:00.000Z");

    const normalized = normalizeConvergedCommandInput({
      summary: "  ready for approval  ",
      refs: [" artifacts/a.md ", "", "artifacts/a.md", "artifacts/b.md "],
      findings: [
        {
          severity: "P2",
          title: "  Follow-up item  ",
          refs: [" artifact://a ", "artifact://a", "artifact://b "]
        }
      ],
      now,
      createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
    });

    expect(normalized.summary).toBe("ready for approval");
    expect(normalized.refs).toEqual(["artifacts/a.md", "artifacts/b.md"]);
    expect(normalized.findings).toEqual([
      {
        severity: "P2",
        title: "Follow-up item",
        refs: ["artifact://a", "artifact://b"]
      }
    ]);
    expect(normalized.now).toBe(now);
  });

  it("creates current time when now is omitted", () => {
    const normalized = normalizeConvergedCommandInput({
      summary: "ready",
      createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
    });

    expect(normalized.now).toBeInstanceOf(Date);
    expect(normalized.findings).toEqual([]);
  });

  it("preserves explicit empty findings array at normalization boundary", () => {
    const normalized = normalizeConvergedCommandInput({
      summary: "ready",
      findings: [],
      createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
    });

    expect(normalized.findings).toEqual([]);
  });

  it("throws command error when summary is empty after trim", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "   ",
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow("Convergence summary cannot be empty.");
  });

  it("throws blocker reason code for P0/P1 severities", () => {
    for (const severity of ["P0", "P1"] as const) {
      expect(() =>
        normalizeConvergedCommandInput({
          summary: "ready",
          findings: [
            {
              severity: severity as never,
              title: "not allowed"
            }
          ],
          createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
        })
      ).toThrow(/CONVERGED_BLOCKER_FINDINGS_FORBIDDEN/u);
    }
  });

  it("throws invalid reason code for unknown finding severity", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "ready",
        findings: [
          {
            severity: "P9" as never,
            title: "not allowed"
          }
        ],
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects empty finding refs token with converged invalid reason code", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "ready",
        findings: [
          {
            severity: "P2",
            title: "follow-up",
            refs: ["artifact://review/a.md", "   ", "artifact://review/b.md"]
          }
        ],
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects ambiguous multi-ref finding refs in programmatic normalization", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "ready",
        findings: [
          {
            severity: "P2",
            title: "follow-up",
            refs: ["artifact://review/a.md", "notes-token"]
          }
        ],
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects duplicate non-structured multi-ref tokens in programmatic normalization", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "ready",
        findings: [
          {
            severity: "P2",
            title: "follow-up",
            refs: ["notes-token", "notes-token"]
          }
        ],
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("accepts duplicate structured refs in programmatic normalization", () => {
    const normalized = normalizeConvergedCommandInput({
      summary: "ready",
      findings: [
        {
          severity: "P2",
          title: "follow-up",
          refs: ["artifact://review/a.md", "artifact://review/a.md"]
        }
      ],
      createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
    });

    expect(normalized.findings).toEqual([
      {
        severity: "P2",
        title: "follow-up",
        refs: ["artifact://review/a.md"]
      }
    ]);
  });

  it("rejects summary open-claim without findings in programmatic normalization", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "P2 findings remain open.",
        findings: [],
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });

  it("rejects summary clean/no-findings claim when findings are present in programmatic normalization", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "No findings remain.",
        findings: [
          {
            severity: "P2",
            title: "follow-up",
            refs: ["artifact://review/a.md"]
          }
        ],
        createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
      })
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });

  it("accepts resolved-count summary phrasing with structured findings in programmatic normalization", () => {
    const normalized = normalizeConvergedCommandInput({
      summary: "2 findings were resolved.",
      findings: [
        {
          severity: "P2",
          title: "follow-up",
          refs: ["artifact://review/a.md"]
        }
      ],
      createError: (input) => new SyntheticConvergedCommandError(toErrorMessage(input))
    });

    expect(normalized.findings).toEqual([
      {
        severity: "P2",
        title: "follow-up",
        refs: ["artifact://review/a.md"]
      }
    ]);
  });
});
