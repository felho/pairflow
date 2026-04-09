import { describe, expect, it } from "vitest";

import { MetaReviewGateErrorV11 as MetaReviewGateError } from "../../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import { WorkspaceResolutionError } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { normalizeConvergedCommandError } from "../../../../src/v11/application/converged/convergedCommandErrorNormalization.js";

class SyntheticConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticConvergedCommandError";
  }
}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

function runNormalization(error: unknown): unknown {
  return normalizeConvergedCommandError({
    error,
    isConvergedCommandError: (candidate) =>
      candidate instanceof SyntheticConvergedCommandError,
    createConvergedCommandError: (message) =>
      new SyntheticConvergedCommandError(toErrorMessage(message))
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

  it("preserves structured reason code and context when rewrapping generic errors", () => {
    let captured: PairflowCommandErrorInput | undefined;
    const rootError = Object.assign(new Error("Gate evaluator failed: policy_gate"), {
      reasonCode: "GATE_EVALUATOR_FAILED",
      context: {
        profile: "converged",
        gate_id: "policy_gate"
      }
    });

    const normalized = normalizeConvergedCommandError({
      error: rootError,
      isConvergedCommandError: (candidate) =>
        candidate instanceof SyntheticConvergedCommandError,
      createConvergedCommandError: (input) => {
        captured = input;
        return new SyntheticConvergedCommandError(
          typeof input === "string" ? input : input.message
        );
      }
    });

    expect(normalized).toBeInstanceOf(SyntheticConvergedCommandError);
    expect(captured).toEqual({
      reasonCode: "GATE_EVALUATOR_FAILED",
      message: "Gate evaluator failed: policy_gate",
      context: {
        profile: "converged",
        gate_id: "policy_gate"
      }
    });
  });

  it("returns non-Error values unchanged", () => {
    const normalized = runNormalization("raw-error-value");
    expect(normalized).toBe("raw-error-value");
  });
});
