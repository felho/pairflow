import type { ReviewerFocusExtractionResult } from "../shared/reviewer/reviewerBrief.js";

export type ReadReviewerBriefArtifactPort = (
  artifactPath: string
) => Promise<string | undefined>;

export type ReadReviewerFocusArtifactPort = (
  artifactPath: string
) => Promise<ReviewerFocusExtractionResult | undefined>;
