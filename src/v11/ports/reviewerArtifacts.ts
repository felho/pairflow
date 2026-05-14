import type { ReviewerFocusExtractionResult } from "../shared/reviewer/reviewerBrief.js";
import type {
  BubbleReviewAutoReworkSeverity
} from "../shared/reviewPolicy/reviewPolicyTypes.js";

export type ReadReviewerBriefArtifactPort = (
  artifactPath: string
) => Promise<string | undefined>;

export type ReadReviewerFocusArtifactPort = (
  artifactPath: string
) => Promise<ReviewerFocusExtractionResult | undefined>;

export type EnsureReviewerPolicySnapshotFailureStage =
  | "write"
  | "read_back"
  | "validate_non_empty";

export interface EnsureReviewerPolicySnapshotInput {
  artifactsDir: string;
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity;
}

export type EnsureReviewerPolicySnapshotResult =
  | {
      ok: true;
      policySnapshotPathAbs: string;
    }
  | {
      ok: false;
      stage: EnsureReviewerPolicySnapshotFailureStage;
      artifactPathAbs: string;
      sourceDoc: string;
      reason: string;
      cause?: unknown;
    };

export type EnsureReviewerPolicySnapshotPort = (
  input: EnsureReviewerPolicySnapshotInput
) => Promise<EnsureReviewerPolicySnapshotResult>;
