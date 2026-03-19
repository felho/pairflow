import { describe, expect, it } from "vitest";

import { ConvergedCommandError } from "../../../../src/v11/shared/converged/convergedCommandError.js";

describe("ConvergedCommandError", () => {
  it("uses stable error name and message", () => {
    const error = new ConvergedCommandError("boom");

    expect(error.name).toBe("ConvergedCommandError");
    expect(error.message).toBe("boom");
  });
});
