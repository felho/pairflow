import type { AgentRole, BubbleConfig } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";
import type { ReviewVerificationInputResolution } from "../../../core/reviewer/reviewVerification.js";
import { assertNoDocsOnlySkipLogRefConflict } from "../../domain/pass/docsOnlyRuntimeSkipGuard.js";
import { validateReviewerVerificationConsistency } from "../../domain/pass/reviewerVerificationConsistencyGuard.js";

export interface PrepareReviewerVerificationInput {
  reviewArtifactType: BubbleConfig["review_artifact_type"];
  senderRole: AgentRole;
  summary: string;
  refs: string[];
  accuracyCritical: boolean;
  worktreePath: string;
  intent: PassIntent;
  hasFindings: boolean;
  createError: (message: string) => Error;
}

export interface PrepareReviewerVerificationDependencies {
  assertNoDocsOnlySkipLogRefConflict?: typeof assertNoDocsOnlySkipLogRefConflict;
  resolveReviewerVerification?: (input: {
    accuracyCritical: boolean;
    senderRole: AgentRole;
    refs: string[];
    worktreePath: string;
    createError: (message: string) => Error;
  }) => Promise<ReviewVerificationInputResolution | undefined>;
  validateReviewerVerificationConsistency?: typeof validateReviewerVerificationConsistency;
}

export async function prepareReviewerVerification(
  input: PrepareReviewerVerificationInput,
  dependencies: PrepareReviewerVerificationDependencies = {}
): Promise<ReviewVerificationInputResolution | undefined> {
  const assertNoDocsOnlyConflict =
    dependencies.assertNoDocsOnlySkipLogRefConflict
    ?? assertNoDocsOnlySkipLogRefConflict;
  const assertVerificationConsistency =
    dependencies.validateReviewerVerificationConsistency
    ?? validateReviewerVerificationConsistency;
  const resolveVerification = dependencies.resolveReviewerVerification;

  if (resolveVerification === undefined) {
    // reason_code=REVIEWER_VERIFICATION_PREPARATION_INVALID context=missing_resolver_dependency
    throw input.createError(
      "Reviewer verification resolver dependency is required for preparation."
    );
  }

  assertNoDocsOnlyConflict({
    reviewArtifactType: input.reviewArtifactType,
    senderRole: input.senderRole,
    summary: input.summary,
    refs: input.refs,
    createError: input.createError
  });

  const reviewerVerification = await resolveVerification({
    accuracyCritical: input.accuracyCritical,
    senderRole: input.senderRole,
    refs: input.refs,
    worktreePath: input.worktreePath,
    createError: input.createError
  });

  if (reviewerVerification !== undefined) {
    assertVerificationConsistency({
      payloadOverall: reviewerVerification.payload.overall,
      intent: input.intent,
      hasFindings: input.hasFindings,
      createError: input.createError
    });
  }

  return reviewerVerification;
}
