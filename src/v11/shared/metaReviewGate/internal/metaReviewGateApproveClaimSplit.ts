import { resolveNonNegativeIntegerField } from "../../../domain/metaReviewGate/findingsClaimParsing.js";

export const metaReviewApproveAdvisorySplitRequiredReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED";
export const metaReviewApproveAdvisorySplitFormatInvalidReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID";
export const metaReviewApproveBlockingFindingsPresentReasonCode =
  "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT";
export const metaReviewApproveAdvisoryOnlyReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_ONLY";

export interface ApproveSplitTriplet {
  claimed: number;
  blocking: number;
  advisory: number;
}

export type ApproveSplitTripletResolution =
  | { ok: true; value: ApproveSplitTriplet }
  | { ok: false; reason: string };

export function resolveApproveSplitTriplet(
  reportJson: Record<string, unknown>
): ApproveSplitTripletResolution {
  const claimed = resolveNonNegativeIntegerField(
    reportJson,
    "findings_claimed_open_total"
  );
  const blocking = resolveNonNegativeIntegerField(
    reportJson,
    "findings_blocking_open_total"
  );
  const advisory = resolveNonNegativeIntegerField(
    reportJson,
    "findings_advisory_open_total"
  );
  const missing: string[] = [];
  if (claimed === undefined) {
    missing.push("findings_claimed_open_total");
  }
  if (blocking === undefined) {
    missing.push("findings_blocking_open_total");
  }
  if (advisory === undefined) {
    missing.push("findings_advisory_open_total");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      reason:
        `${metaReviewApproveAdvisorySplitRequiredReasonCode}: recommendation=approve requires split fields (${missing.join(", ")}).`
    };
  }
  const invalid: string[] = [];
  if (claimed === null) {
    invalid.push("findings_claimed_open_total");
  }
  if (blocking === null) {
    invalid.push("findings_blocking_open_total");
  }
  if (advisory === null) {
    invalid.push("findings_advisory_open_total");
  }
  if (invalid.length > 0) {
    return {
      ok: false,
      reason:
        `${metaReviewApproveAdvisorySplitFormatInvalidReasonCode}: recommendation=approve split fields must be non-negative integers (${invalid.join(", ")}).`
    };
  }
  return {
    ok: true,
    value: {
      claimed: claimed as number,
      blocking: blocking as number,
      advisory: advisory as number
    }
  };
}
