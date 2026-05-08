import {
  isPassIntent,
  type PassIntent
} from "../../../../../contracts/kernel/protocol.js";
import { assertReviewerIntentOverrideConsistency } from "../../../../domain/pass/reviewerIntentOverrideGuard.js";

const passIntentResolutionErrorReasonCode = "PASS_INTENT_RESOLUTION_ERROR";

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
        throw input.createError({
          reasonCode: passIntentResolutionErrorReasonCode,
          message: "Reviewer PASS intent inference is missing before intent resolution.",
          context: {
            guard: "pass_intent_resolution",
            phase: "reviewer_inference_missing"
          }
        });
      }
      return input.inferredReviewerIntent;
    }
    return inferDefaultIntent(input.senderRole);
  })();

  if (!isValidPassIntent(intentCandidate)) {
    throw input.createError({
      reasonCode: passIntentResolutionErrorReasonCode,
      message: `Invalid pass intent: ${String(intentCandidate)}`,
      context: {
        guard: "pass_intent_resolution",
        phase: "invalid_pass_intent",
        intent_candidate: String(intentCandidate)
      }
    });
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
