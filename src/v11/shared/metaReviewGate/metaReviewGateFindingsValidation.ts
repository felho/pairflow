import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import { type FindingsParityMetadata } from "../../../types/protocol.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";
import {
  validateApproveStructuredMetaReviewClaim
} from "./metaReviewGateApproveClaimValidation.js";
import {
  validateStructuredMetaReviewClaimPreflight
} from "./metaReviewGateFindingsValidationPreflight.js";
import {
  validateStructuredMetaReviewPositiveClaimReworkPath
} from "./metaReviewGateFindingsValidationParity.js";

export {
  metaReviewSummaryStructuredMismatchReasonCode,
  metaReviewApproveBlockingFindingsPresentReasonCode,
  metaReviewApproveAdvisoryOnlyReasonCode,
  metaReviewApproveAdvisorySplitRequiredReasonCode,
  metaReviewApproveAdvisorySplitFormatInvalidReasonCode
} from "./metaReviewGateApproveClaimValidation.js";

export async function validateStructuredMetaReviewPositiveClaim(input: {
  runResult: MetaReviewResult;
  reportJson?: Record<string, unknown>;
  bubbleDir: string;
  artifactsDir: string;
  readFileFn: MetaReviewGateArtifactReadFn;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; diagnostics: string[]; metadata: FindingsParityMetadata | null }
  | { ok: false; reason: string; metadata: FindingsParityMetadata | null }
> {
  const recommendation = input.runResult.recommendation;
  const preflight = validateStructuredMetaReviewClaimPreflight({
    recommendation,
    ...(input.reportJson !== undefined ? { reportJson: input.reportJson } : {})
  });
  if (preflight.kind === "fail") {
    return { ok: false, reason: preflight.reason, metadata: null };
  }
  if (preflight.kind === "pass") {
    return { ok: true, diagnostics: [], metadata: null };
  }
  if (preflight.kind === "approve") {
    const approveValidation = validateApproveStructuredMetaReviewClaim({
      runResult: input.runResult,
      reportJson: preflight.reportJson,
      claimState: preflight.claimState
    });
    if (!approveValidation.ok) {
      return {
        ok: false,
        reason: approveValidation.reason,
        metadata: approveValidation.metadata
      };
    }
    return {
      ok: true,
      diagnostics: approveValidation.diagnostics,
      metadata: approveValidation.metadata
    };
  }

  return validateStructuredMetaReviewPositiveClaimReworkPath({
    runResult: input.runResult,
    reportJson: preflight.reportJson,
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir,
    readFileFn: input.readFileFn,
    ...(input.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.sleepForRetryMs }
      : {})
  });
}
