import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { normalizeAskHumanCommandError } from "../../../../src/v11/shared/askHuman/askHumanCommandErrorNormalization.js";

class SyntheticAskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticAskHumanCommandError";
  }
}

function runNormalization(error: unknown): unknown {
  return normalizeAskHumanCommandError({
    error,
    isAskHumanCommandError: (candidate) =>
      candidate instanceof SyntheticAskHumanCommandError,
    createAskHumanCommandError: (message: PairflowCommandErrorInput) => new SyntheticAskHumanCommandError(toErrorMessage(message))
  });
}

describe("askHumanCommandErrorNormalization", () => {
  it("returns existing ask-human command error instance unchanged", () => {
    const existing = new SyntheticAskHumanCommandError("already normalized");

    const normalized = runNormalization(existing);
    expect(normalized).toBe(existing);
  });

  it("converts generic Error to ask-human command error", () => {
    const normalized = runNormalization(new Error("unexpected"));

    expect(normalized).toBeInstanceOf(SyntheticAskHumanCommandError);
    expect((normalized as Error).message).toBe("unexpected");
  });

  it("returns non-Error values unchanged", () => {
    const normalized = runNormalization("raw-error-value");
    expect(normalized).toBe("raw-error-value");
  });
});
