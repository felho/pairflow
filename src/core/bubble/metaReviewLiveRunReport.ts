import {
  isNonEmptyString
} from "../validation.js";
import type {
  MetaReviewRecommendation
} from "../../types/bubble.js";
import {
  isFindingsClaimState,
  type FindingsParityStatus
} from "../../types/protocol.js";
import {
  resolveFindingsOpenSplitFromReportJson
} from "../../v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.js";

export const CANONICAL_META_REVIEW_REPORT_REF = "artifacts/meta-review-last.json";

export function normalizeOptionalText(value: string | undefined): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function resolveClaimStateFromRecommendation(
  recommendation: MetaReviewRecommendation
): "clean" | "open_findings" | "unknown" {
  if (recommendation === "approve") {
    return "clean";
  }
  if (recommendation === "rework") {
    return "open_findings";
  }
  return "unknown";
}

function normalizeNonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function resolveCanonicalMetaReviewReportJson(input: {
  recommendation: MetaReviewRecommendation;
  reportJson?: Record<string, unknown>;
  runId: string;
}): Record<string, unknown> {
  const base = input.reportJson ?? {};
  const rawState = base.findings_claim_state;
  const claimState = isFindingsClaimState(rawState)
    ? rawState
    : resolveClaimStateFromRecommendation(input.recommendation);
  const claimSource = "meta_review_artifact";
  const fallbackCount = 0;
  const countFromFindings = typeof base.findings === "number"
    && Number.isInteger(base.findings)
    && base.findings >= 0
    ? base.findings
    : Array.isArray(base.findings)
      ? base.findings.length
      : undefined;
  const findingsCount =
    typeof base.findings_count === "number" &&
      Number.isInteger(base.findings_count) &&
      base.findings_count >= 0
      ? base.findings_count
      : (countFromFindings ?? fallbackCount);
  const splitFromReportJson = resolveFindingsOpenSplitFromReportJson(base);
  const findingsClaimedOpenTotal =
    normalizeNonNegativeInt(base.findings_claimed_open_total) ?? findingsCount;
  const hasExplicitBlockingOpenTotal = Object.hasOwn(
    base,
    "findings_blocking_open_total"
  );
  const hasExplicitAdvisoryOpenTotal = Object.hasOwn(
    base,
    "findings_advisory_open_total"
  );
  const explicitBlockingOpenTotal = normalizeNonNegativeInt(
    base.findings_blocking_open_total
  );
  const explicitAdvisoryOpenTotal = normalizeNonNegativeInt(
    base.findings_advisory_open_total
  );
  const hasInvalidExplicitSplitField =
    (hasExplicitBlockingOpenTotal && explicitBlockingOpenTotal === null) ||
    (hasExplicitAdvisoryOpenTotal && explicitAdvisoryOpenTotal === null);
  let findingsBlockingOpenTotal =
    explicitBlockingOpenTotal ?? splitFromReportJson.findings_blocking_open_total;
  let findingsAdvisoryOpenTotal =
    explicitAdvisoryOpenTotal ?? splitFromReportJson.findings_advisory_open_total;
  if (input.recommendation === "approve" && !hasInvalidExplicitSplitField) {
    if (
      findingsBlockingOpenTotal === null &&
      findingsAdvisoryOpenTotal === null
    ) {
      if (findingsClaimedOpenTotal === 0) {
        findingsBlockingOpenTotal = 0;
        findingsAdvisoryOpenTotal = 0;
      }
    } else if (
      findingsBlockingOpenTotal === null &&
      findingsAdvisoryOpenTotal !== null
    ) {
      const derivedBlockingOpenTotal =
        findingsClaimedOpenTotal - findingsAdvisoryOpenTotal;
      if (derivedBlockingOpenTotal >= 0) {
        findingsBlockingOpenTotal = derivedBlockingOpenTotal;
      }
    } else if (
      findingsBlockingOpenTotal !== null &&
      findingsAdvisoryOpenTotal === null
    ) {
      const derivedAdvisoryOpenTotal =
        findingsClaimedOpenTotal - findingsBlockingOpenTotal;
      if (derivedAdvisoryOpenTotal >= 0) {
        findingsAdvisoryOpenTotal = derivedAdvisoryOpenTotal;
      }
    }
  }
  const findingsArtifactRefFromInput =
    isNonEmptyString(base.findings_artifact_ref)
      ? base.findings_artifact_ref.trim()
      : null;
  let findingsArtifactRef = findingsArtifactRefFromInput;
  if (input.recommendation === "rework") {
    if (
      findingsArtifactRefFromInput === null ||
      findingsArtifactRefFromInput === CANONICAL_META_REVIEW_REPORT_REF
    ) {
      findingsArtifactRef = CANONICAL_META_REVIEW_REPORT_REF;
    }
  }
  const resolvedMetaReviewRunId = isNonEmptyString(base.meta_review_run_id)
    ? base.meta_review_run_id.trim()
    : isNonEmptyString(base.findings_run_id)
      ? base.findings_run_id.trim()
      : input.runId;
  const findingsRunId = resolvedMetaReviewRunId;
  const findingsDigestSha256 = isNonEmptyString(base.findings_digest_sha256)
    ? base.findings_digest_sha256.trim().toLowerCase()
    : null;
  const findingsArtifactStatus = isNonEmptyString(base.findings_artifact_status)
    ? base.findings_artifact_status.trim()
    : isNonEmptyString(base.artifact_status)
      ? base.artifact_status.trim()
      : null;
  const findingsArtifactOpenTotal =
    typeof base.findings_artifact_open_total === "number" &&
      Number.isInteger(base.findings_artifact_open_total) &&
      base.findings_artifact_open_total >= 0
      ? base.findings_artifact_open_total
      : null;
  const findingsParityStatusRaw = isNonEmptyString(base.findings_parity_status)
    ? base.findings_parity_status.trim()
    : null;
  const findingsParityStatus: FindingsParityStatus | null =
    findingsParityStatusRaw === "ok" ||
      findingsParityStatusRaw === "mismatch" ||
      findingsParityStatusRaw === "guard_failed"
      ? findingsParityStatusRaw
      : null;

  return {
    ...base,
    findings_claim_state: claimState,
    findings_claim_source: claimSource,
    findings_count: findingsCount,
    findings_claimed_open_total: findingsClaimedOpenTotal,
    findings_blocking_open_total: findingsBlockingOpenTotal,
    findings_advisory_open_total: findingsAdvisoryOpenTotal,
    findings_artifact_ref: findingsArtifactRef,
    findings_run_id: findingsRunId,
    meta_review_run_id: resolvedMetaReviewRunId,
    findings_digest_sha256: findingsDigestSha256,
    findings_artifact_status: findingsArtifactStatus,
    artifact_status: findingsArtifactStatus,
    findings_artifact_open_total: findingsArtifactOpenTotal,
    findings_parity_status: findingsParityStatus
  };
}
