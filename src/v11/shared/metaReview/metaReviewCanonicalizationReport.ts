import {
  isFindingsClaimState,
  type FindingsParityStatus
} from "../../../types/protocol.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  resolveFindingsOpenSplitFromReportJson
} from "../metaReviewGate/metaReviewGateFindingsSplit.js";
import { isNonEmptyString } from "../validation/primitives.js";

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

function resolveFindingsCount(base: Record<string, unknown>): number {
  const fallbackCount = 0;
  const countFromFindings =
    typeof base.findings === "number" &&
    Number.isInteger(base.findings) &&
    base.findings >= 0
      ? base.findings
      : Array.isArray(base.findings)
        ? base.findings.length
        : undefined;

  return typeof base.findings_count === "number" &&
    Number.isInteger(base.findings_count) &&
    base.findings_count >= 0
    ? base.findings_count
    : (countFromFindings ?? fallbackCount);
}

function resolveFindingsSplitTotals(input: {
  base: Record<string, unknown>;
  recommendation: MetaReviewRecommendation;
  findingsCount: number;
}): {
  findingsClaimedOpenTotal: number;
  findingsBlockingOpenTotal: number | null;
  findingsAdvisoryOpenTotal: number | null;
} {
  const splitFromReportJson = resolveFindingsOpenSplitFromReportJson(input.base);
  const findingsClaimedOpenTotal =
    normalizeNonNegativeInt(input.base.findings_claimed_open_total) ??
    input.findingsCount;
  const hasExplicitBlockingOpenTotal = Object.hasOwn(
    input.base,
    "findings_blocking_open_total"
  );
  const hasExplicitAdvisoryOpenTotal = Object.hasOwn(
    input.base,
    "findings_advisory_open_total"
  );
  const explicitBlockingOpenTotal = normalizeNonNegativeInt(
    input.base.findings_blocking_open_total
  );
  const explicitAdvisoryOpenTotal = normalizeNonNegativeInt(
    input.base.findings_advisory_open_total
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
      findingsAdvisoryOpenTotal === null &&
      findingsClaimedOpenTotal === 0
    ) {
      findingsBlockingOpenTotal = 0;
      findingsAdvisoryOpenTotal = 0;
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

  return {
    findingsClaimedOpenTotal,
    findingsBlockingOpenTotal,
    findingsAdvisoryOpenTotal
  };
}

function resolveFindingsArtifactRef(input: {
  base: Record<string, unknown>;
  recommendation: MetaReviewRecommendation;
}): string | null {
  const findingsArtifactRefFromInput = isNonEmptyString(input.base.findings_artifact_ref)
    ? input.base.findings_artifact_ref.trim()
    : null;
  if (input.recommendation === "rework" && findingsArtifactRefFromInput === null) {
    return null;
  }
  return findingsArtifactRefFromInput;
}

function resolveCanonicalRunMetadata(input: {
  base: Record<string, unknown>;
  runId: string;
}): {
  resolvedMetaReviewRunId: string;
  findingsRunId: string;
} {
  const resolvedMetaReviewRunId = isNonEmptyString(input.base.meta_review_run_id)
    ? input.base.meta_review_run_id.trim()
    : isNonEmptyString(input.base.findings_run_id)
      ? input.base.findings_run_id.trim()
      : input.runId;

  return {
    resolvedMetaReviewRunId,
    findingsRunId: resolvedMetaReviewRunId
  };
}

function resolveArtifactMetadata(base: Record<string, unknown>): {
  findingsDigestSha256: string | null;
  findingsArtifactStatus: string | null;
  findingsArtifactOpenTotal: number | null;
  findingsParityStatus: FindingsParityStatus | null;
} {
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
    findingsDigestSha256,
    findingsArtifactStatus,
    findingsArtifactOpenTotal,
    findingsParityStatus
  };
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
  const findingsCount = resolveFindingsCount(base);
  const {
    findingsClaimedOpenTotal,
    findingsBlockingOpenTotal,
    findingsAdvisoryOpenTotal
  } = resolveFindingsSplitTotals({
    base,
    recommendation: input.recommendation,
    findingsCount
  });
  const findingsArtifactRef = resolveFindingsArtifactRef({
    base,
    recommendation: input.recommendation
  });
  const { resolvedMetaReviewRunId, findingsRunId } =
    resolveCanonicalRunMetadata({
      base,
      runId: input.runId
    });
  const {
    findingsDigestSha256,
    findingsArtifactStatus,
    findingsArtifactOpenTotal,
    findingsParityStatus
  } = resolveArtifactMetadata(base);

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
