import { isRecord } from "../../../core/validation.js";
import {
  type FindingsParityMetadata,
  type FindingsParityStatus
} from "../../../types/protocol.js";
import { resolveFindingsCountFromMetaReviewReportJson } from "./metaReviewGateFindingsClaimParsing.js";
export {
  readMetaReviewReportJsonArtifact,
  resolveFindingsArtifactPath
} from "./metaReviewGateFindingsArtifactJson.js";
export {
  resolveFindingsCountFromMetaReviewReportJson,
  resolveStructuredMetaReviewClaimFromReportJson
} from "./metaReviewGateFindingsClaimParsing.js";

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function resolveMetaReviewRunId(
  reportJson: Record<string, unknown>
): string | undefined {
  if (
    typeof reportJson.meta_review_run_id === "string" &&
    reportJson.meta_review_run_id.trim().length > 0
  ) {
    return reportJson.meta_review_run_id.trim();
  }
  if (
    typeof reportJson.findings_run_id === "string" &&
    reportJson.findings_run_id.trim().length > 0
  ) {
    return reportJson.findings_run_id.trim();
  }
  return undefined;
}

export function resolveFindingsArtifactStatus(
  reportJson: Record<string, unknown>
): string | undefined {
  if (
    typeof reportJson.findings_artifact_status === "string" &&
    reportJson.findings_artifact_status.trim().length > 0
  ) {
    return reportJson.findings_artifact_status.trim();
  }
  if (
    typeof reportJson.artifact_status === "string" &&
    reportJson.artifact_status.trim().length > 0
  ) {
    return reportJson.artifact_status.trim();
  }
  return undefined;
}

export function resolveFindingsDigestSha256(
  reportJson: Record<string, unknown>
): string | undefined {
  if (
    typeof reportJson.findings_digest_sha256 !== "string" ||
    reportJson.findings_digest_sha256.trim().length === 0
  ) {
    return undefined;
  }
  const normalized = reportJson.findings_digest_sha256.trim().toLowerCase();
  return /^[a-f0-9]{64}$/u.test(normalized) ? normalized : undefined;
}

export function resolveFindingsArtifactOpenTotalFromArtifact(
  artifact: Record<string, unknown>
): number | undefined {
  const candidates: unknown[] = [
    artifact.open_total,
    artifact.findings_open_total
  ];
  if (isRecord(artifact.summary)) {
    candidates.push(artifact.summary.open_total);
  }
  if (isRecord(artifact.findings_summary)) {
    candidates.push(artifact.findings_summary.open_total);
  }
  for (const candidate of candidates) {
    if (isNonNegativeInteger(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resolveFindingsParityStatus(
  reportJson: Record<string, unknown>
): FindingsParityStatus | null {
  if (typeof reportJson.findings_parity_status === "string") {
    if (reportJson.findings_parity_status === "ok") {
      return "ok";
    }
    if (reportJson.findings_parity_status === "mismatch") {
      return "mismatch";
    }
    if (reportJson.findings_parity_status === "guard_failed") {
      return "guard_failed";
    }
  }
  return null;
}

export function resolveFindingsParityMetadataFromReportJson(
  reportJson: Record<string, unknown> | undefined
): FindingsParityMetadata | null {
  if (reportJson === undefined) {
    return null;
  }
  const claimCount = resolveFindingsCountFromMetaReviewReportJson(reportJson);
  const artifactCount = isNonNegativeInteger(reportJson.findings_artifact_open_total)
    ? reportJson.findings_artifact_open_total
    : null;
  return {
    findings_claimed_open_total: claimCount ?? null,
    findings_artifact_open_total: artifactCount,
    findings_artifact_status: resolveFindingsArtifactStatus(reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(reportJson) ?? null,
    findings_parity_status: resolveFindingsParityStatus(reportJson)
  };
}
