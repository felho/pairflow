import {
  evaluateNoFindingsSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../convergence/policy.js";
import { MetaReviewError } from "../../v11/shared/metaReview/metaReviewError.js";
import type {
  MetaReviewRecommendation
} from "../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata
} from "../../types/protocol.js";
import {
  type LatestSameRoundReviewerSnapshot,
  readLatestSameRoundReviewerSnapshotFromTranscript,
  resolveFindingsParityMetadataFromReportJson
} from "../../v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.js";

export function assertApproveRecommendationConsistentWithReviewerSnapshot(
  input: {
    summary: string;
    reportJson: Record<string, unknown>;
    latestSnapshot: LatestSameRoundReviewerSnapshot | undefined;
  }
): void {
  const latestSnapshot = input.latestSnapshot;
  if (latestSnapshot === undefined || latestSnapshot.findings_open_total === null) {
    return;
  }

  const parityMetadata = resolveFindingsParityMetadataFromReportJson(input.reportJson);
  if (parityMetadata === null || !hasApproveFindingsSplitMetadata(parityMetadata)) {
    return;
  }

  const mismatchDetails: string[] = [];
  if (parityMetadata.findings_claimed_open_total !== latestSnapshot.findings_open_total) {
    mismatchDetails.push(
      `claimed=${parityMetadata.findings_claimed_open_total} snapshot_open_total=${latestSnapshot.findings_open_total}`
    );
  }
  if (
    latestSnapshot.findings_blocking_open_total !== null &&
    parityMetadata.findings_blocking_open_total
      !== latestSnapshot.findings_blocking_open_total
  ) {
    mismatchDetails.push(
      `blocking=${parityMetadata.findings_blocking_open_total} snapshot_blocking=${latestSnapshot.findings_blocking_open_total}`
    );
  }
  if (
    latestSnapshot.findings_advisory_open_total !== null &&
    parityMetadata.findings_advisory_open_total
      !== latestSnapshot.findings_advisory_open_total
  ) {
    mismatchDetails.push(
      `advisory=${parityMetadata.findings_advisory_open_total} snapshot_advisory=${latestSnapshot.findings_advisory_open_total}`
    );
  }
  if (mismatchDetails.length > 0) {
    throw new MetaReviewError(
      "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT",
      `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT: latest same-round reviewer snapshot (${latestSnapshot.envelopeId}) contradicts approve report_json (${mismatchDetails.join("; ")}).`
    );
  }

  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const advisoryOnlyOpenFindings =
    latestSnapshot.findings_open_total > 0 &&
    latestSnapshot.findings_blocking_open_total === 0 &&
    latestSnapshot.findings_advisory_open_total !== null &&
    latestSnapshot.findings_advisory_open_total === latestSnapshot.findings_open_total;
  if (
    noFindingsAssertion.hasNoFindingsAssertion &&
    latestSnapshot.findings_open_total > 0 &&
    !(
      advisoryOnlyOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    )
  ) {
    throw new MetaReviewError(
      "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT",
      `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT: latest same-round reviewer snapshot (${latestSnapshot.envelopeId}) reports open findings, so clean approve summary cannot be emitted.`
    );
  }
}

export async function readLatestApproveReviewerSnapshot(input: {
  recommendation: MetaReviewRecommendation;
  transcriptPath: string;
  round: number;
}): Promise<LatestSameRoundReviewerSnapshot | undefined> {
  if (input.recommendation !== "approve") {
    return undefined;
  }
  return readLatestSameRoundReviewerSnapshotFromTranscript(
    input.transcriptPath,
    input.round
  );
}
