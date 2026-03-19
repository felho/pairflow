import type { AgentRole } from "../../../types/bubble.js";
import {
  resolveReviewVerificationInputFromRefs,
  ReviewVerificationError,
  type ReviewVerificationInputResolution
} from "../../../core/reviewer/reviewVerification.js";

interface ResolveReviewerVerificationInput {
  accuracyCritical: boolean;
  senderRole: AgentRole;
  refs: string[];
  worktreePath: string;
  createError: (message: string) => Error;
  resolveInputFromRefs?: (
    input: {
      refs: string[];
      worktreePath: string;
    }
  ) => Promise<ReviewVerificationInputResolution>;
}

function raiseReviewerVerificationResolverError(
  createError: (message: string) => Error,
  message: string
): never {
  // reason_code=REVIEWER_VERIFICATION_RESOLUTION_FAILED context=reviewer_verification_resolution
  throw createError(message);
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
      raiseReviewerVerificationResolverError(input.createError, error.message);
    }
    throw error;
  }
}
