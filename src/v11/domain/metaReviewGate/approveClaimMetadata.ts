import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { resolveNonNegativeIntegerField } from "./findingsClaimParsing.js";
import {
  resolveFindingsArtifactStatus,
  resolveFindingsDigestSha256,
  resolveMetaReviewRunId
} from "./findingsParityMetadata.js";
import type { ApproveSplitTriplet } from "./approveClaimSplit.js";
import {
  metaReviewApproveAdvisoryOnlyReasonCode,
  metaReviewApproveBlockingFindingsPresentReasonCode
} from "./approveClaimSplit.js";
import { metaReviewFindingsParityGuardReasonCode } from "./findingsParityMetadata.js";

export function buildApproveParityMetadata(input: {
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

export function buildApproveGuardFailedMetadata(
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

export function markApproveGuardFailedMetadata(
  metadata: FindingsParityMetadata
): FindingsParityMetadata {
  return {
    ...metadata,
    findings_parity_status: "guard_failed"
  };
}

export function resolveApproveArtifactOpenTotal(
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

export function resolveApproveInvariantViolation(input: {
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

export function resolveApproveDiagnostics(split: ApproveSplitTriplet): string[] {
  if (split.advisory === 0) {
    return [];
  }
  return [
    `${metaReviewApproveAdvisoryOnlyReasonCode}: recommendation=approve accepted with advisory-only open findings (claimed=${split.claimed}; blocking=${split.blocking}; advisory=${split.advisory}).`
  ];
}
