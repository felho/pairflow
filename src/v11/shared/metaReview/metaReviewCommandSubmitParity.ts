import {
  isInteger
} from "../validation/primitives.js";
import { MetaReviewError } from "./metaReviewError.js";
import {
  resolveStructuredMetaReviewClaimFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsClaimParsing.js";
import {
  resolveFindingsOpenSplitFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsMetadata.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../../domain/convergence/policy.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";

function requireStructuredMetaReviewClaim(
  reportJson: Record<string, unknown>
): {
  state: "clean" | "open_findings" | "unknown";
  source: "meta_review_artifact";
} {
  const parsed = resolveStructuredMetaReviewClaimFromReportJson({ reportJson });
  if ("reason" in parsed) {
    throw new MetaReviewError("META_REVIEW_SCHEMA_INVALID", parsed.reason);
  }
  if (parsed.claim === undefined) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json requires findings_claim_state and findings_claim_source fields"
    );
  }
  return parsed.claim;
}

function requireStructuredFindingsCount(reportJson: Record<string, unknown>): number {
  if (!Object.hasOwn(reportJson, "findings_count")) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json.findings_count is required and must be a non-negative integer"
    );
  }
  const explicitCount = reportJson.findings_count;
  if (!isInteger(explicitCount) || explicitCount < 0) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit report_json.findings_count is required and must be a non-negative integer"
    );
  }
  return explicitCount;
}

function normalizeNonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function assertSummaryStructuredParity(input: {
  recommendation: MetaReviewRecommendation;
  summary: string;
  reportJson: Record<string, unknown>;
}): void {
  const structuredClaim = requireStructuredMetaReviewClaim(input.reportJson);
  const structuredCount = requireStructuredFindingsCount(input.reportJson);
  if (
    (structuredClaim.state === "open_findings" && structuredCount === 0) ||
    (structuredClaim.state === "clean" && structuredCount > 0)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "meta-review submit structured claim/count tuple is inconsistent"
    );
  }
  const summaryPositiveAssertion =
    evaluatePositiveSummaryFindingsAssertion(input.summary);
  const summaryNoFindingsAssertion =
    evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const structuredHasOpenFindings =
    structuredClaim.state === "open_findings" || structuredCount > 0;

  if (summaryPositiveAssertion.hasPositiveAssertion && structuredCount === 0) {
    throw new MetaReviewError(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH",
      "meta-review submit summary claims open findings while report_json.findings_count is 0"
    );
  }

  if (
    summaryNoFindingsAssertion.hasNoFindingsAssertion &&
    structuredHasOpenFindings
  ) {
    const split = resolveFindingsOpenSplitFromReportJson(input.reportJson);
    const claimedOpenTotal =
      normalizeNonNegativeInt(input.reportJson.findings_claimed_open_total)
      ?? structuredCount;
    const hasAdvisoryOnlyApproveOpenFindings =
      input.recommendation === "approve" &&
      structuredClaim.state === "open_findings" &&
      claimedOpenTotal > 0 &&
      split.findings_blocking_open_total === 0 &&
      split.findings_advisory_open_total === claimedOpenTotal;
    if (
      hasAdvisoryOnlyApproveOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    ) {
      return;
    }
    throw new MetaReviewError(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH",
      "meta-review submit summary claims no findings while structured report_json claims open findings"
    );
  }
}
