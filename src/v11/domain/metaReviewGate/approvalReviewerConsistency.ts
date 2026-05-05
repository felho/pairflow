import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../convergence/policy.js";
import type { ApprovalAdvisoryFinding } from "./approvalParitySnapshot.js";

export const metaReviewGateReviewerConvergenceConflictReasonCode =
  "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT";

export interface ApprovalReviewerSnapshot {
  envelopeId: string;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_open_total: number | null;
}

export interface ApprovalReviewerConsistencyConflict {
  reasonCode: typeof metaReviewGateReviewerConvergenceConflictReasonCode;
  message: string;
  advisoryOnlyCorrectionHintRequired: boolean;
}

export function isAdvisoryOnlyApprovalReviewerSnapshot(
  snapshot: ApprovalReviewerSnapshot
): boolean {
  return (
    snapshot.findings_open_total !== null &&
    snapshot.findings_open_total > 0 &&
    snapshot.findings_blocking_open_total === 0 &&
    snapshot.findings_advisory_open_total !== null &&
    snapshot.findings_advisory_open_total === snapshot.findings_open_total
  );
}

export function resolveSnapshotParityMismatchMessage(input: {
  parityMetadata: FindingsParityMetadata | null | undefined;
  snapshot: ApprovalReviewerSnapshot;
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

export function resolveApprovePathReviewerConsistencyConflict(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  summary: string;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
  advisoryFindingsExplicitlyProvided: boolean;
  snapshot: ApprovalReviewerSnapshot | undefined;
}): ApprovalReviewerConsistencyConflict | null {
  if (input.route !== "human_gate_approve" || input.recommendation !== "approve") {
    return null;
  }
  if (input.snapshot === undefined || input.snapshot.findings_open_total === null) {
    return null;
  }

  const parityMismatch = resolveSnapshotParityMismatchMessage({
    parityMetadata: input.parityMetadata,
    snapshot: input.snapshot
  });
  if (parityMismatch !== null) {
    return {
      reasonCode: metaReviewGateReviewerConvergenceConflictReasonCode,
      message:
        `latest same-round reviewer snapshot (${input.snapshot.envelopeId}) contradicts approval parity metadata (${parityMismatch}).`,
      advisoryOnlyCorrectionHintRequired:
        isAdvisoryOnlyApprovalReviewerSnapshot(input.snapshot)
    };
  }

  if (input.advisoryFindingsExplicitlyProvided) {
    const advisoryListCount = input.advisoryFindings?.length ?? 0;
    if (
      input.snapshot.findings_advisory_open_total !== null &&
      advisoryListCount !== input.snapshot.findings_advisory_open_total
    ) {
      return {
        reasonCode: metaReviewGateReviewerConvergenceConflictReasonCode,
        message:
          `explicit advisory findings payload (${advisoryListCount}) contradicts latest same-round reviewer snapshot advisory total (${input.snapshot.findings_advisory_open_total}).`,
        advisoryOnlyCorrectionHintRequired: false
      };
    }
  }

  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const advisoryOnlyOpenFindings =
    isAdvisoryOnlyApprovalReviewerSnapshot(input.snapshot);
  if (
    noFindingsAssertion.hasNoFindingsAssertion &&
    input.snapshot.findings_open_total > 0 &&
    !(
      advisoryOnlyOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    )
  ) {
    return {
      reasonCode: metaReviewGateReviewerConvergenceConflictReasonCode,
      message:
        `latest same-round reviewer snapshot (${input.snapshot.envelopeId}) reports open findings, so clean approve summary cannot be emitted.`,
      advisoryOnlyCorrectionHintRequired: advisoryOnlyOpenFindings
    };
  }

  return null;
}
