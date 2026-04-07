import {
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../../../v11/domain/convergence/policy.js";
import type { ApproveSplitTriplet } from "./metaReviewGateApproveClaimSplit.js";

export const metaReviewSummaryStructuredMismatchReasonCode =
  "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH";

function hasNonEmptySummary(summary: string | null | undefined): summary is string {
  return typeof summary === "string" && summary.trim().length > 0;
}

export function resolveApproveSummaryStructuredMismatch(input: {
  summary: string | null | undefined;
  split: ApproveSplitTriplet;
}): string | null {
  if (!hasNonEmptySummary(input.summary)) {
    return null;
  }
  const positiveAssertion = evaluatePositiveSummaryFindingsAssertion(input.summary);
  if (positiveAssertion.hasPositiveAssertion && input.split.claimed === 0) {
    return (
      `${metaReviewSummaryStructuredMismatchReasonCode}: summary claims open findings while structured split claims 0 open findings.`
    );
  }
  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  if (noFindingsAssertion.hasNoFindingsAssertion && input.split.claimed > 0) {
    const advisoryOnlyOpenFindings =
      input.split.blocking === 0
      && input.split.advisory === input.split.claimed;
    if (
      advisoryOnlyOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    ) {
      return null;
    }
    return (
      `${metaReviewSummaryStructuredMismatchReasonCode}: summary claims no findings while structured split claims open findings.`
    );
  }
  return null;
}
