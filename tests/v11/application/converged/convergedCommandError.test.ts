import { describe, expect, it } from "vitest";

import {
  ConvergedCommandError,
  createConvergedCommandError,
  isConvergedCommandError
} from "../../../../src/v11/shared/converged/convergedCommandError.js";

describe("ConvergedCommandError", () => {
  it("uses stable error name and message", () => {
    const error = new ConvergedCommandError("boom");

    expect(error.name).toBe("ConvergedCommandError");
    expect(error.message).toBe("boom");
  });

  it("creates command error via factory helper", () => {
    const error = createConvergedCommandError("factory boom");

    expect(error).toBeInstanceOf(ConvergedCommandError);
    expect(error.message).toBe("factory boom");
  });

  it("uses normalized public message while retaining raw detail and structured fields", () => {
    const error = createConvergedCommandError({
      reasonCode: "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED",
      message: "Convergence validation failed",
      context: {
        command_name: "converged",
        gate_id: "converged_validation"
      }
    });

    expect(error.message).toBe(
      "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED: Convergence validation failed context={\"command_name\":\"converged\",\"gate_id\":\"converged_validation\"}"
    );
    expect(error.detailMessage).toBe("Convergence validation failed");
    expect(error.reasonCode).toBe("CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED");
    expect(error.context).toEqual({
      command_name: "converged",
      gate_id: "converged_validation"
    });
  });

  it("recognizes command error instances via type guard", () => {
    expect(isConvergedCommandError(new ConvergedCommandError("boom"))).toBe(true);
    expect(isConvergedCommandError(new Error("boom"))).toBe(false);
  });
});
