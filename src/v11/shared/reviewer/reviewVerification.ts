import type {
  AgentName
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  ReviewVerificationArtifact,
  ReviewVerificationPayload
} from "./reviewVerificationContract.js";

export {
  REVIEW_VERIFICATION_ARTIFACT_FILENAME,
  REVIEW_VERIFICATION_INPUT_FILENAME,
  REVIEW_VERIFICATION_SCHEMA,
  ReviewVerificationError,
  reviewVerificationClaimStatuses,
  reviewVerificationOveralls,
  reviewVerificationStates
} from "./reviewVerificationContract.js";
export type {
  ReviewVerificationArtifact,
  ReviewVerificationArtifactStatus,
  ReviewVerificationClaim,
  ReviewVerificationClaimStatus,
  ReviewVerificationOverall,
  ReviewVerificationState,
  ReviewVerificationValidationError
} from "./reviewVerificationContract.js";
export {
  validateReviewVerificationArtifact,
  validateReviewVerificationPayload
} from "./reviewVerificationValidation.js";

export interface ReviewVerificationInputResolution {
  inputRef: string;
  resolvedPath: string;
  payload: ReviewVerificationPayload;
}

export function createReviewVerificationArtifact(input: {
  payload: ReviewVerificationPayload;
  inputRef: string;
  bubbleId: string;
  round: number;
  reviewer: AgentName;
  generatedAt: string;
}): ReviewVerificationArtifact {
  return {
    schema: input.payload.schema,
    overall: input.payload.overall,
    claims: input.payload.claims,
    input_ref: input.inputRef,
    meta: {
      bubble_id: input.bubbleId,
      round: input.round,
      reviewer: input.reviewer,
      generated_at: input.generatedAt
    },
    validation: {
      status: "valid",
      errors: []
    }
  };
}
