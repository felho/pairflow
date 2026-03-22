import { describe, expect, it } from "vitest";

import {
  normalizeApprovalDecisionInput,
  normalizeRequestReworkInput
} from "../../../../src/v11/shared/approval/approvalCommandInputNormalization.js";

class ApprovalInputNormalizationTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ApprovalInputNormalizationTestError";
  }
}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

const createError: PairflowCreateCommandError = (input) =>
  new ApprovalInputNormalizationTestError(toErrorMessage(input));

describe("approvalCommandInputNormalization", () => {
  it("normalizes decision input refs and override reason", () => {
    const now = new Date("2026-03-19T21:00:00.000Z");
    const normalized = normalizeApprovalDecisionInput({
      bubbleId: "b_approval_01",
      decision: "approve",
      overrideNonApprove: true,
      overrideReason: "  manual confirmation  ",
      message: "  verified manually  ",
      refs: ["  a.md ", "", "a.md", "b.md"],
      cwd: "/repo/worktrees/b_approval_01",
      now,
      createApprovalCommandError: createError
    });

    expect(normalized).toMatchObject({
      bubbleId: "b_approval_01",
      decision: "approve",
      overrideNonApprove: true,
      overrideReason: "manual confirmation",
      message: "verified manually",
      refs: ["a.md", "b.md"],
      cwd: "/repo/worktrees/b_approval_01",
      now
    });
  });

  it("rejects empty override reason after trimming", () => {
    expect(() =>
      normalizeApprovalDecisionInput({
        bubbleId: "b_approval_02",
        decision: "approve",
        overrideReason: "   ",
        createApprovalCommandError: createError
      })
    ).toThrow(/APPROVAL_OVERRIDE_REASON_REQUIRED/u);
  });

  it("normalizes request-rework input and validates message", () => {
    const now = new Date("2026-03-19T21:01:00.000Z");
    const normalized = normalizeRequestReworkInput({
      bubbleId: "b_approval_03",
      message: "  Please rerun with focused tests. ",
      refs: ["x.md", " x.md ", "y.md"],
      now,
      createApprovalCommandError: createError
    });

    expect(normalized).toMatchObject({
      bubbleId: "b_approval_03",
      message: "Please rerun with focused tests.",
      refs: ["x.md", "y.md"],
      now
    });
  });
});
