import { describe, expect, it } from "vitest";

import {
  SchemaValidationError,
  assertValidation,
  isIsoTimestamp,
  isRecord,
  validationFail,
  validationOk
} from "../../../../src/v11/shared/validation/primitives.js";

describe("v11 validation primitives", () => {
  it("accepts strict UTC ISO format", () => {
    expect(isIsoTimestamp("2026-02-21T12:34:56Z")).toBe(true);
    expect(isIsoTimestamp("2026-02-21T12:34:56.123456Z")).toBe(true);
  });

  it("rejects loose or invalid timestamp values", () => {
    expect(isIsoTimestamp("Tuesday")).toBe(false);
    expect(isIsoTimestamp("2026-02-30T12:34:56Z")).toBe(false);
  });

  it("keeps assertValidation error semantics", () => {
    expect(assertValidation(validationOk("ok"), "should not throw")).toBe("ok");

    try {
      assertValidation(
        validationFail([
          {
            path: "payload",
            message: "invalid"
          }
        ]),
        "bad payload"
      );
      throw new Error("Expected SchemaValidationError.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).message).toBe("bad payload");
      expect(error).toMatchObject({
        context: {
          source: "assert_validation",
          errorCount: 1,
          firstErrorPath: "payload"
        }
      });
    }
  });

  it("keeps object-only record detection", () => {
    expect(isRecord({ bubble_id: "b_01" })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });

  it("exports the canonical schema validation error type", () => {
    const error = new SchemaValidationError("invalid", []);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("SchemaValidationError");
  });
});
