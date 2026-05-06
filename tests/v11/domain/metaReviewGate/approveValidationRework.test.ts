import { describe, expect, it } from "vitest";

import {
  buildApproveValidationReworkMessage,
  isApproveValidationCommandFailure
} from "../../../../src/v11/domain/metaReviewGate/approveValidationRework.js";

describe("approve validation rework policy", () => {
  it("classifies command-exit approve validation failures as actionable rework", () => {
    expect(
      isApproveValidationCommandFailure(
        "META_REVIEW_APPROVE_VALIDATION_FAILED: approve-gate validation failed stage=exec command=typecheck detail=command exited 2"
      )
    ).toBe(true);
  });

  it("does not classify spawn/configuration failures as actionable command rework", () => {
    expect(
      isApproveValidationCommandFailure(
        "META_REVIEW_APPROVE_VALIDATION_FAILED: approve-gate validation failed stage=spawn detail=runner unavailable"
      )
    ).toBe(false);
    expect(
      isApproveValidationCommandFailure(
        "META_REVIEW_APPROVE_VALIDATION_FAILED: approve-gate validation failed stage=policy detail=commands.typecheck is empty"
      )
    ).toBe(false);
  });

  it("builds an implementer-facing rework message with validation details", () => {
    const fallbackReason =
      "META_REVIEW_APPROVE_VALIDATION_FAILED: approve-gate validation failed stage=exec command=typecheck detail=command exited 2";

    const message = buildApproveValidationReworkMessage(fallbackReason);

    expect(message).toContain("required approve-gate validation failed");
    expect(message).toContain(fallbackReason);
    expect(message).toContain("fix it in this bubble worktree");
    expect(message).toContain("ask the human for direction");
  });
});
