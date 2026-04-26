import type { Finding } from "../../../types/findings.js";
import type { PassIntent } from "../../../types/protocol.js";
import type {
  BubbleReviewAutoReworkSeverity,
  ReviewArtifactType
} from "../../../types/bubble.js";
import {
  assertReviewerNoFindingsSummaryConsistency,
  inferReviewerPassIntent,
  validateReviewerPassGate
} from "../../domain/pass/reviewerDecision.js";
import {
  resolveReviewerFindingsClaim,
  resolveReviewerFindingsClaimParserMetadata,
  type ReviewerFindingsClaim,
  type ReviewerFindingsClaimParserMetadata
} from "../../domain/pass/reviewerFindingsClaim.js";

export interface PrepareReviewerPassInput {
  senderRole: "implementer" | "reviewer";
  round: number;
  noFindings: boolean;
  findings: Finding[];
  hasFindings: boolean;
  findingsPayloadInvalid: boolean;
  reviewArtifactType: ReviewArtifactType;
  severityGateRound: number;
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity;
  summary: string;
  createError: PairflowCreateCommandError;
}

export interface PrepareReviewerPassDependencies {
  validateReviewerPassGate?: typeof validateReviewerPassGate;
  assertReviewerNoFindingsSummaryConsistency?: typeof assertReviewerNoFindingsSummaryConsistency;
  inferReviewerPassIntent?: typeof inferReviewerPassIntent;
  resolveReviewerFindingsClaim?: typeof resolveReviewerFindingsClaim;
  resolveReviewerFindingsClaimParserMetadata?: typeof resolveReviewerFindingsClaimParserMetadata;
}

export interface PrepareReviewerPassResult {
  inferredReviewerIntent?: PassIntent;
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
}

export function prepareReviewerPass(
  input: PrepareReviewerPassInput,
  dependencies: PrepareReviewerPassDependencies = {}
): PrepareReviewerPassResult {
  const validateReviewerPass =
    dependencies.validateReviewerPassGate
    ?? validateReviewerPassGate;
  const assertReviewerNoFindingsSummary =
    dependencies.assertReviewerNoFindingsSummaryConsistency
    ?? assertReviewerNoFindingsSummaryConsistency;
  const inferReviewerIntent =
    dependencies.inferReviewerPassIntent
    ?? inferReviewerPassIntent;
  const resolveFindingsClaim =
    dependencies.resolveReviewerFindingsClaim
    ?? resolveReviewerFindingsClaim;
  const resolveFindingsClaimParserMetadata =
    dependencies.resolveReviewerFindingsClaimParserMetadata
    ?? resolveReviewerFindingsClaimParserMetadata;

  if (input.senderRole !== "reviewer") {
    if (input.hasFindings || input.noFindings) {
      // reason_code=REVIEWER_PASS_PREPARATION_INVALID context=reviewer_only_findings_flags
      throw input.createError(
        "Implementer PASS does not accept findings flags; findings are reviewer-only."
      );
    }
    return {};
  }

  validateReviewerPass({
    round: input.round,
    noFindings: input.noFindings,
    findings: input.findings,
    findingsPayloadInvalid: input.findingsPayloadInvalid,
    reviewArtifactType: input.reviewArtifactType,
    severityGateRound: input.severityGateRound,
    reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity,
    createError: input.createError
  });
  assertReviewerNoFindingsSummary({
    summary: input.summary,
    noFindings: input.noFindings,
    createError: input.createError
  });

  const inferredReviewerIntent = inferReviewerIntent({
    hasFindings: input.hasFindings,
    noFindings: input.noFindings,
    createError: input.createError
  });
  const reviewerFindingsClaim = resolveFindingsClaim({
    noFindings: input.noFindings,
    findings: input.findings,
    createError: input.createError
  });
  const reviewerFindingsClaimParserMetadata =
    resolveFindingsClaimParserMetadata({
      summary: input.summary,
      claimState: reviewerFindingsClaim.state
    });

  return {
    inferredReviewerIntent,
    reviewerFindingsClaim,
    reviewerFindingsClaimParserMetadata
  };
}
