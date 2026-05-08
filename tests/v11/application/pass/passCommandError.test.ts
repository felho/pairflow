import { describe, expect, it } from "vitest";

import {
  createPassCommandError,
  PassCommandError,
  throwAsPassCommandError
} from "../../../../src/v11/application/pass/internal/normalPass/passCommandError.js";

describe("passCommandError", () => {
  it("creates typed pass command error instances", () => {
    const error = createPassCommandError("boom");
    expect(error).toBeInstanceOf(PassCommandError);
    expect(error.message).toBe("boom");
  });

  it("rethrows PassCommandError instances unchanged", () => {
    const original = new PassCommandError("already normalized");
    expect(() => throwAsPassCommandError(original)).toThrow(original);
  });

  it("maps generic Error values to PassCommandError", () => {
    expect(() => throwAsPassCommandError(new Error("unexpected"))).toThrowError(
      PassCommandError
    );
  });

  it("rethrows non-Error values unchanged", () => {
    expect(() => throwAsPassCommandError("raw-error")).toThrow("raw-error");
  });
});
