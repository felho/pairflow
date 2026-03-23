import type { AgentRole } from "../../../types/bubble.js";
import {
  resolveReviewVerificationInputFromRefs,
  ReviewVerificationError,
  type ReviewVerificationInputResolution
} from "../../../core/reviewer/reviewVerification.js";

const reviewerVerificationResolutionFailedReasonCode =
  "REVIEWER_VERIFICATION_RESOLUTION_FAILED";

interface ResolveReviewerVerificationInput {
  accuracyCritical: boolean;
  senderRole: AgentRole;
  refs: string[];
  worktreePath: string;
  createError: PairflowCreateCommandError;
  resolveInputFromRefs?: (
    input: {
      refs: string[];
      worktreePath: string;
    }
  ) => Promise<ReviewVerificationInputResolution>;
}

function raiseReviewerVerificationResolverError(
  createError: PairflowCreateCommandError,
  message: string,
  context?: Record<string, unknown>,
  cause?: unknown
): never {
  throw createError({
    reasonCode: reviewerVerificationResolutionFailedReasonCode,
    message,
    context: {
      guard: "reviewer_verification_resolution",
      ...(context ?? {})
    },
    ...(cause !== undefined ? { cause } : {})
  });
}

export async function resolveReviewerVerification(
  input: ResolveReviewerVerificationInput
): Promise<ReviewVerificationInputResolution | undefined> {
  if (!input.accuracyCritical || input.senderRole !== "reviewer") {
    return undefined;
  }

  const resolveInputFromRefs =
    input.resolveInputFromRefs ?? resolveReviewVerificationInputFromRefs;
  try {
    return await resolveInputFromRefs({
      refs: input.refs,
      worktreePath: input.worktreePath
    });
  } catch (error) {
    if (error instanceof ReviewVerificationError) {
      raiseReviewerVerificationResolverError(
        input.createError,
        error.message,
        {
          review_verification_code: error.code,
          ref_count: input.refs.length
        },
        error
      );
    }
    throw error;
  }
}
