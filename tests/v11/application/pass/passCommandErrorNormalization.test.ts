import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { WorkspaceResolutionError } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { normalizePassCommandError } from "../../../../src/v11/shared/pass/passCommandErrorNormalization.js";

class SyntheticPassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticPassCommandError";
  }
}

function runNormalization(error: unknown): unknown {
  return normalizePassCommandError({
    error,
    isPassCommandError: (candidate) =>
      candidate instanceof SyntheticPassCommandError,
    createPassCommandError: (message) => new SyntheticPassCommandError(toErrorMessage(message))
  });
}

describe("passCommandErrorNormalization", () => {
  it("returns existing pass command error instance unchanged", () => {
    const existing = new SyntheticPassCommandError("already normalized");

    const normalized = runNormalization(existing);
    expect(normalized).toBe(existing);
  });

  it("converts WorkspaceResolutionError to pass command error", () => {
    const normalized = runNormalization(
      new WorkspaceResolutionError("workspace missing")
    );

    expect(normalized).toBeInstanceOf(SyntheticPassCommandError);
    expect((normalized as Error).message).toBe("workspace missing");
  });

  it("converts generic Error to pass command error", () => {
    const normalized = runNormalization(new Error("unexpected"));

    expect(normalized).toBeInstanceOf(SyntheticPassCommandError);
    expect((normalized as Error).message).toBe("unexpected");
  });

  it("returns non-Error values unchanged", () => {
    const normalized = runNormalization("raw-error-value");
    expect(normalized).toBe("raw-error-value");
  });
});
