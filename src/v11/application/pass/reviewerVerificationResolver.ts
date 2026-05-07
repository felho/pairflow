import type { AgentRole } from "../../../types/bubble.js";
import {
  ReviewVerificationError,
  type ReviewVerificationInputResolution
} from "../../../v11/shared/reviewer/reviewVerification.js";
import type {
  ResolveReviewVerificationInputFromRefsPort
} from "../../../v11/shared/ports/reviewVerificationArtifacts.js";

const reviewerVerificationResolutionFailedReasonCode =
  "REVIEWER_VERIFICATION_RESOLUTION_FAILED";

interface ResolveReviewerVerificationInput {
  accuracyCritical: boolean;
  senderRole: AgentRole;
  refs: string[];
  worktreePath: string;
  createError: PairflowCreateCommandError;
  resolveInputFromRefs?: ResolveReviewVerificationInputFromRefsPort;
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
    input.resolveInputFromRefs;
  if (resolveInputFromRefs === undefined) {
    raiseReviewerVerificationResolverError(
      input.createError,
      "Missing required reviewer verification dependency: resolveReviewVerificationInputFromRefs.",
      {
        dependency: "resolveReviewVerificationInputFromRefs"
      }
    );
  }
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
