import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { normalizePassCommandInput } from "../../../../src/v11/application/pass/passCommandInputNormalization.js";

class SyntheticPassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticPassCommandError";
  }
}

describe("passCommandInputNormalization", () => {
  it("normalizes summary and refs while preserving provided now value", () => {
    const now = new Date("2026-03-19T21:05:00.000Z");

    const normalized = normalizePassCommandInput({
      summary: "  implementer handoff  ",
      refs: [" artifacts/a.md ", "", "artifacts/a.md", "artifacts/b.md "],
      now,
      createError: (message: PairflowCommandErrorInput) => new SyntheticPassCommandError(toErrorMessage(message))
    });

    expect(normalized.summary).toBe("implementer handoff");
    expect(normalized.refs).toEqual(["artifacts/a.md", "artifacts/b.md"]);
    expect(normalized.now).toBe(now);
  });

  it("creates current time when now is omitted", () => {
    const normalized = normalizePassCommandInput({
      summary: "ready",
      createError: (message: PairflowCommandErrorInput) => new SyntheticPassCommandError(toErrorMessage(message))
    });

    expect(normalized.now).toBeInstanceOf(Date);
  });

  it("throws command error when summary is empty after trim", () => {
    expect(() =>
      normalizePassCommandInput({
        summary: "   ",
        createError: (message: PairflowCommandErrorInput) => new SyntheticPassCommandError(toErrorMessage(message))
      })
    ).toThrow("PASS summary cannot be empty.");
  });
});
