import { describe, expect, it } from "vitest";

import {
  formatRepeatCleanPolicyRejectedMessage,
  raiseRepeatCleanAutoConvergeStateStale,
  raiseRepeatCleanDownstreamConvergedRejected,
  raiseRepeatCleanPolicyGateRejected,
  raiseRepeatCleanReviewVerificationWriteFailed
} from "../../../../src/v11/domain/pass/repeatCleanPolicyRejection.js";

class TestRepeatCleanPolicyRejectionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestRepeatCleanPolicyRejectionError";
  }
}

function createError(message: string): Error {
  return new TestRepeatCleanPolicyRejectionError(message);
}

describe("repeatCleanPolicyRejection", () => {
  it("formats rejection message with canonical reason code/subtype prefix", () => {
    const message = formatRepeatCleanPolicyRejectedMessage({
      subtype: "policy_gate_rejected",
      detail: "policy_error"
    });
    expect(message).toBe(
      "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=policy_gate_rejected; policy_error"
    );
  });

  it("raises policy gate rejection including diagnostics detail", () => {
    expect(() =>
      raiseRepeatCleanPolicyGateRejected({
        errors: ["E1", "E2"],
        diagnostics: ["D1", "D2"],
        createError
      })
    ).toThrowError(
      new TestRepeatCleanPolicyRejectionError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=policy_gate_rejected; E1 E2 diagnostics=D1 D2"
      )
    );
  });

  it("raises policy gate rejection without diagnostics suffix when diagnostics are empty", () => {
    expect(() =>
      raiseRepeatCleanPolicyGateRejected({
        errors: ["E1"],
        diagnostics: [],
        createError
      })
    ).toThrowError(
      new TestRepeatCleanPolicyRejectionError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=policy_gate_rejected; E1"
      )
    );
  });

  it("raises explicit stale-state rejection", () => {
    expect(() =>
      raiseRepeatCleanAutoConvergeStateStale({
        createError
      })
    ).toThrowError(
      new TestRepeatCleanPolicyRejectionError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=policy_gate_rejected; AUTO_CONVERGE_STATE_STALE: state changed between repeat-clean evaluation and convergence transition."
      )
    );
  });

  it("raises review-verification write failure rejection", () => {
    expect(() =>
      raiseRepeatCleanReviewVerificationWriteFailed({
        reason: "permission denied",
        createError
      })
    ).toThrowError(
      new TestRepeatCleanPolicyRejectionError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=review_verification_write_failed; review-verification artifact write failed before convergence transition. Root error: permission denied"
      )
    );
  });

  it("raises downstream converged rejection", () => {
    expect(() =>
      raiseRepeatCleanDownstreamConvergedRejected({
        reason: "converged command failed",
        createError
      })
    ).toThrowError(
      new TestRepeatCleanPolicyRejectionError(
        "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED: subtype=downstream_converged_rejected; converged command failed"
      )
    );
  });
});
