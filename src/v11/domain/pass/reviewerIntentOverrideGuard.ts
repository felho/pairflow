import type { PassIntent } from "../../../types/protocol.js";

function raiseReviewerIntentOverrideError(
  createError: PairflowCreateCommandError,
  message: string
): never {
  // reason_code=REVIEWER_INTENT_OVERRIDE_INVALID context=reviewer_intent_override_guard
  throw createError(message);
}

export function assertReviewerIntentOverrideConsistency(input: {
  intent: PassIntent;
  noFindings: boolean;
  hasFindings: boolean;
  createError: PairflowCreateCommandError;
}): void {
  // `intent=task` remains implementer-only by design; reviewer handoff
  // semantics are constrained to `review`/`fix_request` with findings flags.
  if (input.intent === "task") {
    raiseReviewerIntentOverrideError(
      input.createError,
      "Reviewer PASS cannot use intent=task."
    );
  }
  if (input.noFindings && input.intent === "fix_request") {
    raiseReviewerIntentOverrideError(
      input.createError,
      "Reviewer PASS with --no-findings cannot use intent=fix_request."
    );
  }
  if (input.hasFindings && input.intent === "review") {
    raiseReviewerIntentOverrideError(
      input.createError,
      "Reviewer PASS with findings cannot use intent=review."
    );
  }
}
