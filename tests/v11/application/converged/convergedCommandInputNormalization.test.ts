import { describe, expect, it } from "vitest";

import { normalizeConvergedCommandInput } from "../../../../src/v11/shared/converged/convergedCommandInputNormalization.js";

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
      now,
      createError: (message) => new SyntheticConvergedCommandError(message)
    });

    expect(normalized.summary).toBe("ready for approval");
    expect(normalized.refs).toEqual(["artifacts/a.md", "artifacts/b.md"]);
    expect(normalized.now).toBe(now);
  });

  it("creates current time when now is omitted", () => {
    const normalized = normalizeConvergedCommandInput({
      summary: "ready",
      createError: (message) => new SyntheticConvergedCommandError(message)
    });

    expect(normalized.now).toBeInstanceOf(Date);
  });

  it("throws command error when summary is empty after trim", () => {
    expect(() =>
      normalizeConvergedCommandInput({
        summary: "   ",
        createError: (message) => new SyntheticConvergedCommandError(message)
      })
    ).toThrow("Convergence summary cannot be empty.");
  });
});
