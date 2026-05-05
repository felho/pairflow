import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import {
  buildApproveGuardFailedMetadata,
  buildApproveParityMetadata,
  markApproveGuardFailedMetadata,
  resolveApproveArtifactOpenTotal,
  resolveApproveDiagnostics,
  resolveApproveInvariantViolation
} from "../../../domain/metaReviewGate/approveClaimMetadata.js";
import {
  metaReviewApproveAdvisoryOnlyReasonCode,
  metaReviewApproveAdvisorySplitFormatInvalidReasonCode,
  metaReviewApproveAdvisorySplitRequiredReasonCode,
  metaReviewApproveBlockingFindingsPresentReasonCode,
  resolveApproveSplitTriplet
} from "../../../domain/metaReviewGate/approveClaimSplit.js";
import {
  metaReviewSummaryStructuredMismatchReasonCode,
  resolveApproveSummaryStructuredMismatch
} from "../../../domain/metaReviewGate/approveClaimSummaryMismatch.js";

export {
  metaReviewApproveAdvisoryOnlyReasonCode,
  metaReviewApproveAdvisorySplitFormatInvalidReasonCode,
  metaReviewApproveAdvisorySplitRequiredReasonCode,
  metaReviewApproveBlockingFindingsPresentReasonCode,
  metaReviewSummaryStructuredMismatchReasonCode
};

type ApproveClaimValidationResult =
  | { ok: true; diagnostics: string[]; metadata: FindingsParityMetadata }
  | { ok: false; reason: string; metadata: FindingsParityMetadata };

export function validateApproveStructuredMetaReviewClaim(input: {
  runResult: MetaReviewResult;
  reportJson: Record<string, unknown>;
  claimState: "clean" | "open_findings";
}): ApproveClaimValidationResult {
  const splitResolution = resolveApproveSplitTriplet(input.reportJson);
  if (!splitResolution.ok) {
    return {
      ok: false,
      reason: splitResolution.reason,
      metadata: buildApproveGuardFailedMetadata(input.reportJson)
    };
  }

  const split = splitResolution.value;
  const summaryMismatch = resolveApproveSummaryStructuredMismatch({
    summary: input.runResult.summary,
    split
  });
  const artifactOpenTotal = resolveApproveArtifactOpenTotal(input.reportJson);
  const metadata = buildApproveParityMetadata({
    reportJson: input.reportJson,
    split,
    artifactOpenTotal
  });
  if (summaryMismatch !== null) {
    return {
      ok: false,
      reason: summaryMismatch,
      metadata: markApproveGuardFailedMetadata(metadata)
    };
  }

  const invariantViolation = resolveApproveInvariantViolation({
    split,
    claimState: input.claimState,
    artifactOpenTotal
  });
  if (invariantViolation !== null) {
    return {
      ok: false,
      reason: invariantViolation,
      metadata: markApproveGuardFailedMetadata(metadata)
    };
  }
  return {
    ok: true,
    diagnostics: resolveApproveDiagnostics(split),
    metadata
  };
}
