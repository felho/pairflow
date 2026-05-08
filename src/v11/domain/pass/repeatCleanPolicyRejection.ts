import { repeatCleanAutoconvergePolicyRejectedReasonCode } from "../convergence/repeatCleanAutoconverge.js";

export type RepeatCleanPolicyRejectedSubtype =
  | "policy_gate_rejected"
  | "review_verification_write_failed"
  | "downstream_converged_rejected";

export function formatRepeatCleanPolicyRejectedMessage(input: {
  subtype: RepeatCleanPolicyRejectedSubtype;
  detail: string;
}): string {
  return `${repeatCleanAutoconvergePolicyRejectedReasonCode}: subtype=${input.subtype}; ${input.detail}`;
}

function raiseRepeatCleanPolicyRejection(input: {
  subtype: RepeatCleanPolicyRejectedSubtype;
  detail: string;
  createError: PairflowCreateCommandError;
}): never {
  // reason_code=REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED context=repeat_clean_policy_rejection
  throw input.createError(
    formatRepeatCleanPolicyRejectedMessage({
      subtype: input.subtype,
      detail: input.detail
    })
  );
}

export function raiseRepeatCleanPolicyGateRejected(input: {
  errors: string[];
  diagnostics: string[];
  createError: PairflowCreateCommandError;
}): never {
  const diagnosticsDetail =
    input.diagnostics.length > 0
      ? ` diagnostics=${input.diagnostics.join(" ")}`
      : "";
  raiseRepeatCleanPolicyRejection({
    subtype: "policy_gate_rejected",
    detail: `${input.errors.join(" ")}${diagnosticsDetail}`,
    createError: input.createError
  });
}

export function raiseRepeatCleanAutoConvergeStateStale(input: {
  createError: PairflowCreateCommandError;
}): never {
  raiseRepeatCleanPolicyRejection({
    subtype: "policy_gate_rejected",
    detail:
      "AUTO_CONVERGE_STATE_STALE: state changed between repeat-clean evaluation and convergence transition.",
    createError: input.createError
  });
}

export function raiseRepeatCleanReviewVerificationWriteFailed(input: {
  reason: string;
  createError: PairflowCreateCommandError;
}): never {
  raiseRepeatCleanPolicyRejection({
    subtype: "review_verification_write_failed",
    detail:
      `review-verification artifact write failed before convergence transition. Root error: ${input.reason}`,
    createError: input.createError
  });
}

export function raiseRepeatCleanDownstreamConvergedRejected(input: {
  reason: string;
  createError: PairflowCreateCommandError;
}): never {
  raiseRepeatCleanPolicyRejection({
    subtype: "downstream_converged_rejected",
    detail: input.reason,
    createError: input.createError
  });
}
