import { describe, expect, it } from "vitest";

import { MetaReviewGateErrorV11 as MetaReviewGateError } from "../../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import { WorkspaceResolutionError } from "../../../../src/core/bubble/workspaceResolution.js";
import { normalizeConvergedCommandError } from "../../../../src/v11/shared/converged/convergedCommandErrorNormalization.js";

class SyntheticConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticConvergedCommandError";
  }
}

function runNormalization(error: unknown): unknown {
  return normalizeConvergedCommandError({
    error,
    isConvergedCommandError: (candidate) =>
      candidate instanceof SyntheticConvergedCommandError,
    createConvergedCommandError: (message) =>
      new SyntheticConvergedCommandError(message)
  });
}

describe("convergedCommandErrorNormalization", () => {
  it("returns existing converged command error instance unchanged", () => {
    const existing = new SyntheticConvergedCommandError("already normalized");

    const normalized = runNormalization(existing);
    expect(normalized).toBe(existing);
  });

  it("converts WorkspaceResolutionError to converged command error", () => {
    const normalized = runNormalization(
      new WorkspaceResolutionError("workspace missing")
    );

    expect(normalized).toBeInstanceOf(SyntheticConvergedCommandError);
    expect((normalized as Error).message).toBe("workspace missing");
  });

  it("converts MetaReviewGateError to converged command error", () => {
    const normalized = runNormalization(
      new MetaReviewGateError(
        "META_REVIEW_GATE_RUN_FAILED",
        "meta-review gate failed"
      )
    );

    expect(normalized).toBeInstanceOf(SyntheticConvergedCommandError);
    expect((normalized as Error).message).toBe("meta-review gate failed");
  });

  it("returns non-Error values unchanged", () => {
    const normalized = runNormalization("raw-error-value");
    expect(normalized).toBe("raw-error-value");
  });
});
