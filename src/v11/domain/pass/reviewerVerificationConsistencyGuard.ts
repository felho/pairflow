import type { PassIntent } from "../../../types/protocol.js";

function raiseReviewerVerificationConsistencyError(
  createError: PairflowCreateCommandError,
  message: string
): never {
  // reason_code=REVIEWER_VERIFICATION_CONSISTENCY_INVALID context=reviewer_verification_consistency_guard
  throw createError(message);
}

export function validateReviewerVerificationConsistency(input: {
  payloadOverall: "pass" | "fail";
  intent: PassIntent;
  hasFindings: boolean;
  createError: PairflowCreateCommandError;
}): void {
  if (
    input.payloadOverall === "fail"
    && (input.intent !== "fix_request" || !input.hasFindings)
  ) {
    raiseReviewerVerificationConsistencyError(
      input.createError,
      "Accuracy-critical reviewer PASS with overall=fail requires intent=fix_request and open findings."
    );
  }
  if (
    input.payloadOverall === "pass"
    && (input.intent !== "review" || input.hasFindings)
  ) {
    raiseReviewerVerificationConsistencyError(
      input.createError,
      "Accuracy-critical reviewer PASS with overall=pass requires clean handoff (intent=review and no findings)."
    );
  }
}
