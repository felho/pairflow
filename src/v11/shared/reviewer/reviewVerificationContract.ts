import type { AgentName } from "../../../types/bubble.js";

export const REVIEW_VERIFICATION_SCHEMA = "review_verification_v1";
export const REVIEW_VERIFICATION_INPUT_FILENAME = "review-verification-input.json";
export const REVIEW_VERIFICATION_ARTIFACT_FILENAME = "review-verification.json";

export const reviewVerificationOveralls = ["pass", "fail"] as const;
export type ReviewVerificationOverall = (typeof reviewVerificationOveralls)[number];

export const reviewVerificationClaimStatuses = [
  "verified",
  "mismatch",
  "unknown"
] as const;
export type ReviewVerificationClaimStatus =
  (typeof reviewVerificationClaimStatuses)[number];

export const reviewVerificationStates = [
  "pass",
  "fail",
  "missing",
  "invalid"
] as const;
export type ReviewVerificationState = (typeof reviewVerificationStates)[number];

export interface ReviewVerificationValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface ReviewVerificationClaim {
  claim_id: string;
  status: ReviewVerificationClaimStatus;
  evidence_refs?: string[];
  note?: string;
}

export interface ReviewVerificationPayload {
  schema: typeof REVIEW_VERIFICATION_SCHEMA;
  overall: ReviewVerificationOverall;
  claims: ReviewVerificationClaim[];
}

export interface ReviewVerificationArtifact extends ReviewVerificationPayload {
  input_ref: string;
  meta: {
    bubble_id: string;
    round: number;
    reviewer: AgentName;
    generated_at: string;
  };
  validation: {
    status: "valid" | "invalid";
    errors: ReviewVerificationValidationError[];
  };
}

export interface ReviewVerificationArtifactStatus {
  status: ReviewVerificationState;
  artifact?: ReviewVerificationArtifact;
}

export class ReviewVerificationError extends Error {
  public readonly code: string;

  public constructor(
    code: string,
    message: string
  ) {
    super(message);
    this.name = "ReviewVerificationError";
    this.code = code;
  }
}
