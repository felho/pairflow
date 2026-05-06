import type { MetaReviewRecommendation } from "../../../../types/bubble.js";
import {
  deriveFindingsOpenSplit as deriveFindingsOpenSplitFromMetadata,
  type FindingsOpenSplit
} from "../../../domain/metaReviewGate/findingsSplit.js";
export { projectDisplayableFindingsFromArtifact } from "../../../domain/metaReviewGate/findingsProjection.js";
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
} from "./metaReviewGateFindingsParityInput.js";
export { validateFindingsArtifactParity } from "./metaReviewGateFindingsArtifactParity.js";

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
