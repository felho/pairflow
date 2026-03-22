import { isPassIntent, type PassIntent } from "../../../types/protocol.js";
import { assertReviewerIntentOverrideConsistency } from "../../domain/pass/reviewerIntentOverrideGuard.js";

export interface ResolvePassIntentInput {
  inputIntent?: PassIntent;
  senderRole: "implementer" | "reviewer";
  inferredReviewerIntent?: PassIntent;
  noFindings: boolean;
  hasFindings: boolean;
  createError: PairflowCreateCommandError;
}

export interface ResolvePassIntentDependencies {
  inferDefaultPassIntent?: (role: "implementer" | "reviewer") => PassIntent;
  isPassIntent?: typeof isPassIntent;
  assertReviewerIntentOverrideConsistency?: typeof assertReviewerIntentOverrideConsistency;
}

export interface ResolvePassIntentResult {
  intent: PassIntent;
  inferredIntent: boolean;
}

export function resolvePassIntent(
  input: ResolvePassIntentInput,
  dependencies: ResolvePassIntentDependencies = {}
): ResolvePassIntentResult {
  const inferDefaultIntent =
    dependencies.inferDefaultPassIntent
    ?? ((role) => (role === "implementer" ? "review" : "fix_request"));
  const isValidPassIntent =
    dependencies.isPassIntent
    ?? isPassIntent;
  const assertReviewerIntentOverride =
    dependencies.assertReviewerIntentOverrideConsistency
    ?? assertReviewerIntentOverrideConsistency;

  const inferredIntent = input.inputIntent === undefined;

  const intentCandidate = (() => {
    if (input.inputIntent !== undefined) {
      return input.inputIntent;
    }
    if (input.senderRole === "reviewer") {
      if (input.inferredReviewerIntent === undefined) {
        // reason_code=PASS_INTENT_RESOLUTION_ERROR context=reviewer_inference_missing
        throw input.createError(
          "Reviewer PASS intent inference is missing before intent resolution."
        );
      }
      return input.inferredReviewerIntent;
    }
    return inferDefaultIntent(input.senderRole);
  })();

  if (!isValidPassIntent(intentCandidate)) {
    // reason_code=PASS_INTENT_RESOLUTION_ERROR context=invalid_pass_intent
    throw input.createError(`Invalid pass intent: ${String(intentCandidate)}`);
  }

  if (input.senderRole === "reviewer") {
    assertReviewerIntentOverride({
      intent: intentCandidate,
      noFindings: input.noFindings,
      hasFindings: input.hasFindings,
      createError: input.createError
    });
  }

  return {
    intent: intentCandidate,
    inferredIntent
  };
}
