import type { MetaReviewRecommendation } from "../../../../shared/metaReview/metaReviewTypes.js";
import {
  deriveFindingsOpenSplit as deriveFindingsOpenSplitFromMetadata,
  type FindingsOpenSplit
} from "../../../../domain/metaReviewGate/findingsSplit.js";
export { projectDisplayableFindingsFromArtifact } from "../../../../domain/metaReviewGate/findingsProjection.js";
export {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  metaReviewFindingsRunLinkMissingReasonCode,
  resolveReworkFindingsParityInput,
  type ReworkFindingsParityInput
} from "../../metaReviewGateFindingsParityApi.js";
export { validateFindingsArtifactParity } from "../../metaReviewGateFindingsParityApi.js";

export function deriveFindingsOpenSplit(
  findings: unknown
): FindingsOpenSplit | null {
  return deriveFindingsOpenSplitFromMetadata(findings);
}

export function isPositiveReworkRecommendation(
  recommendation: MetaReviewRecommendation
): boolean {
  return recommendation === "rework";
}
