import { describe, expect, it } from "vitest";

import { SchemaValidationError } from "../../../../../../src/v11/shared/validation/primitives.js";
import { MetaReviewGateError } from "../../../../../../src/v11/shared/metaReviewGate/index.js";
import { toMetaReviewError } from "../../../../../../src/v11/application/metaReview/internal/submit/metaReviewCommandErrorMapping.js";

describe("metaReviewCommandErrorMapping", () => {
  it("maps schema validation errors to META_REVIEW_SCHEMA_INVALID", () => {
    const mapped = toMetaReviewError(
      new SchemaValidationError("Invalid snapshot", [
        {
          path: "meta_review",
          message: "Must be an object"
        }
      ])
    );

    expect(mapped.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
  });

  it("maps gate errors to META_REVIEW_GATE_RUN_FAILED while preserving the gate code", () => {
    const mapped = toMetaReviewError(
      new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "gate transition mismatch"
      )
    );

    expect(mapped.reasonCode).toBe("META_REVIEW_GATE_RUN_FAILED");
    expect(mapped.message).toContain("META_REVIEW_GATE_TRANSITION_INVALID");
  });

  it("maps io-style errors to META_REVIEW_IO_ERROR", () => {
    const mapped = toMetaReviewError(
      Object.assign(new Error("permission denied"), { code: "EACCES" })
    );

    expect(mapped.reasonCode).toBe("META_REVIEW_IO_ERROR");
    expect(mapped.message).toContain("EACCES");
  });

  it("maps generic errors to META_REVIEW_UNKNOWN_ERROR", () => {
    expect(toMetaReviewError(new Error("unexpected failure")).reasonCode).toBe(
      "META_REVIEW_UNKNOWN_ERROR"
    );
  });
});
