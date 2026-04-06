import {
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion
} from "../../../v11/domain/convergence/policy.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { resolveNonNegativeIntegerField } from "./metaReviewGateFindingsClaimParsing.js";
import {
  resolveFindingsArtifactStatus,
  resolveFindingsDigestSha256,
  resolveMetaReviewRunId
} from "./metaReviewGateFindingsMetadata.js";
import { metaReviewFindingsParityGuardReasonCode } from "./metaReviewGateFindingsParityHelpers.js";

export const metaReviewSummaryStructuredMismatchReasonCode =
  "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH";
export const metaReviewApproveBlockingFindingsPresentReasonCode =
  "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT";
export const metaReviewApproveAdvisoryOnlyReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_ONLY";
export const metaReviewApproveAdvisorySplitRequiredReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED";
export const metaReviewApproveAdvisorySplitFormatInvalidReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID";

interface ApproveSplitTriplet {
  claimed: number;
  blocking: number;
  advisory: number;
}

type ApproveSplitTripletResolution =
  | { ok: true; value: ApproveSplitTriplet }
  | { ok: false; reason: string };

type ApproveClaimValidationResult =
  | { ok: true; diagnostics: string[]; metadata: FindingsParityMetadata }
  | { ok: false; reason: string; metadata: FindingsParityMetadata };

function resolveApproveSplitTriplet(
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

function hasNonEmptySummary(summary: string | null | undefined): summary is string {
  return typeof summary === "string" && summary.trim().length > 0;
}

function resolveApproveSummaryStructuredMismatch(input: {
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

function buildApproveParityMetadata(input: {
  reportJson: Record<string, unknown>;
  split: ApproveSplitTriplet;
  artifactOpenTotal: number | null | undefined;
}): FindingsParityMetadata {
  const normalizedArtifactOpenTotal: number | null =
    typeof input.artifactOpenTotal === "number" ? input.artifactOpenTotal : null;
  return {
    findings_claimed_open_total: input.split.claimed,
    findings_artifact_open_total: normalizedArtifactOpenTotal,
    findings_blocking_open_total: input.split.blocking,
    findings_advisory_open_total: input.split.advisory,
    findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(input.reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(input.reportJson) ?? null,
    findings_parity_status: normalizedArtifactOpenTotal !== null ? "ok" : null
  };
}

function buildApproveGuardFailedMetadata(
  reportJson: Record<string, unknown>
): FindingsParityMetadata {
  return {
    findings_claimed_open_total: null,
    findings_artifact_open_total: null,
    findings_blocking_open_total: null,
    findings_advisory_open_total: null,
    findings_artifact_status: resolveFindingsArtifactStatus(reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(reportJson) ?? null,
    findings_parity_status: "guard_failed"
  };
}

function markApproveGuardFailedMetadata(
  metadata: FindingsParityMetadata
): FindingsParityMetadata {
  return {
    ...metadata,
    findings_parity_status: "guard_failed"
  };
}

function resolveApproveArtifactOpenTotal(
  reportJson: Record<string, unknown>
): number | null | undefined {
  const rawField = reportJson.findings_artifact_open_total;
  const resolvedField = resolveNonNegativeIntegerField(
    reportJson,
    "findings_artifact_open_total"
  );
  if (resolvedField === null && rawField === null) {
    return undefined;
  }
  return resolvedField;
}

function resolveApproveInvariantViolation(input: {
  split: ApproveSplitTriplet;
  claimState: "clean" | "open_findings";
  artifactOpenTotal: number | null | undefined;
}): string | null {
  if (input.split.blocking > 0) {
    return (
      `${metaReviewApproveBlockingFindingsPresentReasonCode}: recommendation=approve requires findings_blocking_open_total=0 (found ${input.split.blocking}).`
    );
  }
  if (
    (input.claimState === "clean" && input.split.claimed > 0) ||
    (input.claimState === "open_findings" && input.split.claimed === 0)
  ) {
    return (
      `${metaReviewFindingsParityGuardReasonCode}: findings_claim_state=${input.claimState} contradicts findings_claimed_open_total=${input.split.claimed}.`
    );
  }
  if (input.split.claimed !== input.split.blocking + input.split.advisory) {
    return (
      `${metaReviewFindingsParityGuardReasonCode}: findings_claimed_open_total (${input.split.claimed}) must equal findings_blocking_open_total + findings_advisory_open_total (${input.split.blocking + input.split.advisory}).`
    );
  }
  if (input.artifactOpenTotal === null) {
    return (
      `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_open_total must be a non-negative integer when provided.`
    );
  }
  if (
    input.artifactOpenTotal !== undefined &&
    input.artifactOpenTotal !== input.split.claimed
  ) {
    return (
      `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_open_total (${input.artifactOpenTotal}) must equal findings_claimed_open_total (${input.split.claimed}).`
    );
  }
  return null;
}

function resolveApproveDiagnostics(split: ApproveSplitTriplet): string[] {
  if (split.advisory === 0) {
    return [];
  }
  return [
    `${metaReviewApproveAdvisoryOnlyReasonCode}: recommendation=approve accepted with advisory-only open findings (claimed=${split.claimed}; blocking=${split.blocking}; advisory=${split.advisory}).`
  ];
}

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
