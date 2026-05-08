import type { MetaReviewRecommendation } from "../../../shared/metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import type { LatestSameRoundReviewerSnapshot } from "../../../domain/metaReviewGate/reviewerSnapshot.js";
import {
  buildMetaReviewSubmitAdvisoryOnlyCorrectionNote
} from "../../../shared/metaReview/metaReviewSubmitGuidance.js";
import {
  resolveApprovePathReviewerConsistencyConflict,
  resolveSnapshotParityMismatchMessage
} from "../../../domain/metaReviewGate/approvalReviewerConsistency.js";
import {
  assertAdvisorySplitMetadataWhenRequired,
  hasConsistentApproveAdvisoryOnlySplit,
  normalizeApprovalAdvisoryFindings,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot,
  type ApprovalAdvisoryFinding
} from "../../../domain/metaReviewGate/approvalParitySnapshot.js";

export function assertApprovePathConsistentWithReviewerSnapshot(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  summary: string;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
  advisoryFindingsExplicitlyProvided: boolean;
  snapshot: LatestSameRoundReviewerSnapshot | undefined;
}): void {
  const conflict = resolveApprovePathReviewerConsistencyConflict({
    route: input.route,
    recommendation: input.recommendation,
    summary: input.summary,
    parityMetadata: input.parityMetadata,
    advisoryFindings: input.advisoryFindings,
    advisoryFindingsExplicitlyProvided: input.advisoryFindingsExplicitlyProvided,
    snapshot: input.snapshot
  });
  if (conflict !== null) {
    const context = conflict.message;
    const advisoryOnlyCorrectionHint = conflict.advisoryOnlyCorrectionHintRequired
      ? ` ${buildMetaReviewSubmitAdvisoryOnlyCorrectionNote()}`
      : "";
    throw new Error(
      `${conflict.reasonCode}: ${context}${advisoryOnlyCorrectionHint}`
    );
  }
}

export {
  assertAdvisorySplitMetadataWhenRequired,
  hasConsistentApproveAdvisoryOnlySplit,
  normalizeApprovalAdvisoryFindings,
  resolveAdvisoryContractInvariant,
  resolveSnapshotParityMismatchMessage,
  resolveStructuredParityMetadataSnapshot
};

export type { ApprovalAdvisoryFinding };
