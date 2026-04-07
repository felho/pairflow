import type { AgentName } from "../../../types/bubble.js";
import type {
  ReviewVerificationArtifact,
  ReviewVerificationArtifactStatus,
  ReviewVerificationInputResolution
} from "../reviewer/reviewVerification.js";

export interface ResolveReviewVerificationInputFromRefsInput {
  refs: string[];
  worktreePath: string;
}

export type ResolveReviewVerificationInputFromRefsPort = (
  input: ResolveReviewVerificationInputFromRefsInput
) => Promise<ReviewVerificationInputResolution>;

export interface ReadReviewVerificationArtifactStatusOptions {
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export type ReadReviewVerificationArtifactStatusPort = (
  artifactPath: string,
  options?: ReadReviewVerificationArtifactStatusOptions
) => Promise<ReviewVerificationArtifactStatus>;

export type WriteReviewVerificationArtifactAtomicPort = (
  path: string,
  artifact: ReviewVerificationArtifact
) => Promise<void>;
