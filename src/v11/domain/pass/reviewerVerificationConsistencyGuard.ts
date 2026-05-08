import type { PassIntent } from "../../../contracts/kernel/protocol.js";

const reviewerVerificationConsistencyInvalidReasonCode =
  "REVIEWER_VERIFICATION_CONSISTENCY_INVALID";

function raiseReviewerVerificationConsistencyError(
  createError: PairflowCreateCommandError,
  message: string
): never {
  throw createError({
    reasonCode: reviewerVerificationConsistencyInvalidReasonCode,
    message,
    context: {
      guard: "reviewer_verification_consistency_guard"
    }
  });
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
