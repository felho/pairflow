import type { ReviewArtifactType } from "../../../types/bubble.js";
import type {
  ReviewerTestEvidenceArtifact,
  ReviewerTestExecutionDirective,
  ResolveReviewerTestExecutionDirectiveInput,
  VerifyImplementerTestEvidenceInput
} from "../reviewer/testEvidence.js";

export interface ResolveReviewerTestExecutionDirectiveFromArtifactInput {
  artifact: ReviewerTestEvidenceArtifact;
  worktreePath: string;
  reviewArtifactType?: ReviewArtifactType;
}

export type VerifyImplementerTestEvidencePort = (
  input: VerifyImplementerTestEvidenceInput
) => Promise<ReviewerTestEvidenceArtifact>;

export type ReadReviewerTestEvidenceArtifactPort = (
  artifactPath: string
) => Promise<ReviewerTestEvidenceArtifact | undefined>;

export type WriteReviewerTestEvidenceArtifactPort = (
  artifactPath: string,
  artifact: ReviewerTestEvidenceArtifact
) => Promise<void>;

export type ResolveReviewerTestExecutionDirectivePort = (
  input: ResolveReviewerTestExecutionDirectiveInput
) => Promise<ReviewerTestExecutionDirective>;

export type ResolveReviewerTestExecutionDirectiveFromArtifactPort = (
  input: ResolveReviewerTestExecutionDirectiveFromArtifactInput
) => Promise<ReviewerTestExecutionDirective>;
