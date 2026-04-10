import { describe, expect, it } from "vitest";

import {
  assertSubmitPayloadInvariants,
  assertSubmitStatusIsSuccess,
  resolveSubmitRunStatus
} from "../../../../src/v11/shared/metaReview/metaReviewCommandSubmitValidation.js";

describe("metaReviewCommandSubmitValidation", () => {
  it("always resolves submit status to success for routed submit outcomes", () => {
    expect(resolveSubmitRunStatus()).toBe("success");
  });

  it("accepts inconclusive recommendation when submit payload invariants are satisfied", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "inconclusive",
        reworkTargetMessage: null
      })
    ).not.toThrow();
  });

  it("accepts rework recommendation when a non-empty rework target message is provided", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "rework",
        reworkTargetMessage: "Please address the reviewer concerns."
      })
    ).not.toThrow();
  });

  it("rejects rework recommendation without a non-empty rework target message", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "rework",
        reworkTargetMessage: null
      })
    ).toThrow(/rework target message/u);
  });

  it("rejects advisory rework target messages when they normalize to empty text", () => {
    expect(() =>
      assertSubmitPayloadInvariants({
        recommendation: "approve",
        reworkTargetMessage: "   "
      })
    ).toThrow(/advisory rework target message/u);
  });

  it("rejects non-success submit status even for inconclusive recommendation", () => {
    expect(() => assertSubmitStatusIsSuccess("inconclusive")).toThrow(
      /status=success/u
    );
  });

  it("rejects error status on submit as the same success-only contract", () => {
    expect(() => assertSubmitStatusIsSuccess("error")).toThrow(/status=success/u);
  });
});
