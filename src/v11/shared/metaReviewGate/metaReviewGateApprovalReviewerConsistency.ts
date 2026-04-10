import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../../../v11/domain/convergence/policy.js";
import {
  isAdvisoryOnlyReviewerSnapshot,
  type LatestSameRoundReviewerSnapshot
} from "./metaReviewGateReviewerSnapshot.js";
import {
  buildMetaReviewSubmitAdvisoryOnlyCorrectionNote
} from "../metaReview/metaReviewSubmitGuidance.js";
import {
  assertAdvisorySplitMetadataWhenRequired,
  hasConsistentApproveAdvisoryOnlySplit,
  normalizeApprovalAdvisoryFindings,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot,
  type ApprovalAdvisoryFinding
} from "./metaReviewGateApprovalParitySnapshot.js";

const metaReviewGateReviewerConvergenceConflictReasonCode =
  "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT";

export function resolveSnapshotParityMismatchMessage(input: {
  parityMetadata: FindingsParityMetadata | null | undefined;
  snapshot: LatestSameRoundReviewerSnapshot;
}): string | null {
  if (!hasApproveFindingsSplitMetadata(input.parityMetadata)) {
    return null;
  }

  const mismatchDetails: string[] = [];
  if (
    input.snapshot.findings_open_total !== null &&
    input.parityMetadata.findings_claimed_open_total
      !== input.snapshot.findings_open_total
  ) {
    mismatchDetails.push(
      `claimed=${input.parityMetadata.findings_claimed_open_total} snapshot_open_total=${input.snapshot.findings_open_total}`
    );
  }
  if (
    input.snapshot.findings_blocking_open_total !== null &&
    input.parityMetadata.findings_blocking_open_total
      !== input.snapshot.findings_blocking_open_total
  ) {
    mismatchDetails.push(
      `blocking=${input.parityMetadata.findings_blocking_open_total} snapshot_blocking=${input.snapshot.findings_blocking_open_total}`
    );
  }
  if (
    input.snapshot.findings_advisory_open_total !== null &&
    input.parityMetadata.findings_advisory_open_total
      !== input.snapshot.findings_advisory_open_total
  ) {
    mismatchDetails.push(
      `advisory=${input.parityMetadata.findings_advisory_open_total} snapshot_advisory=${input.snapshot.findings_advisory_open_total}`
    );
  }

  return mismatchDetails.length > 0 ? mismatchDetails.join("; ") : null;
}

export function assertApprovePathConsistentWithReviewerSnapshot(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  summary: string;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
  advisoryFindingsExplicitlyProvided: boolean;
  snapshot: LatestSameRoundReviewerSnapshot | undefined;
}): void {
  if (input.route !== "human_gate_approve" || input.recommendation !== "approve") {
    return;
  }
  if (input.snapshot === undefined || input.snapshot.findings_open_total === null) {
    return;
  }

  const parityMismatch = resolveSnapshotParityMismatchMessage({
    parityMetadata: input.parityMetadata,
    snapshot: input.snapshot
  });
  if (parityMismatch !== null) {
    const advisoryOnlyCorrectionHint = isAdvisoryOnlyReviewerSnapshot(input.snapshot)
      ? ` ${buildMetaReviewSubmitAdvisoryOnlyCorrectionNote()}`
      : "";
    throw new Error(
      `${metaReviewGateReviewerConvergenceConflictReasonCode}: latest same-round reviewer snapshot (${input.snapshot.envelopeId}) contradicts approval parity metadata (${parityMismatch}).${advisoryOnlyCorrectionHint}`
    );
  }

  if (input.advisoryFindingsExplicitlyProvided) {
    const advisoryListCount = input.advisoryFindings?.length ?? 0;
    if (
      input.snapshot.findings_advisory_open_total !== null &&
      advisoryListCount !== input.snapshot.findings_advisory_open_total
    ) {
      throw new Error(
        `${metaReviewGateReviewerConvergenceConflictReasonCode}: explicit advisory findings payload (${advisoryListCount}) contradicts latest same-round reviewer snapshot advisory total (${input.snapshot.findings_advisory_open_total}).`
      );
    }
  }

  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const advisoryOnlyOpenFindings = isAdvisoryOnlyReviewerSnapshot(input.snapshot);
  if (
    noFindingsAssertion.hasNoFindingsAssertion &&
    input.snapshot.findings_open_total > 0 &&
    !(
      advisoryOnlyOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    )
  ) {
    const advisoryOnlyCorrectionHint = advisoryOnlyOpenFindings
      ? ` ${buildMetaReviewSubmitAdvisoryOnlyCorrectionNote()}`
      : "";
    throw new Error(
      `${metaReviewGateReviewerConvergenceConflictReasonCode}: latest same-round reviewer snapshot (${input.snapshot.envelopeId}) reports open findings, so clean approve summary cannot be emitted.${advisoryOnlyCorrectionHint}`
    );
  }
}

export {
  assertAdvisorySplitMetadataWhenRequired,
  hasConsistentApproveAdvisoryOnlySplit,
  normalizeApprovalAdvisoryFindings,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot
};

export type { ApprovalAdvisoryFinding };
