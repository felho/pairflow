import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { isRecord } from "../../../core/validation.js";
import {
  type FindingsParityMetadata,
  type FindingsParityStatus
} from "../../../types/protocol.js";
import { resolveFindingsCountFromMetaReviewReportJson } from "./metaReviewGateFindingsClaimParsing.js";
export {
  resolveFindingsCountFromMetaReviewReportJson,
  resolveStructuredMetaReviewClaimFromReportJson
} from "./metaReviewGateFindingsClaimParsing.js";

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function resolveMetaReviewReportJsonObject(
  source: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }
  if (isRecord(source.report_json)) {
    return source.report_json;
  }
  const hasFlatClaimFields =
    source.findings_claim_state !== undefined ||
    source.findings_claim_source !== undefined ||
    source.findings_count !== undefined ||
    source.findings_artifact_ref !== undefined ||
    source.findings_run_id !== undefined ||
    source.meta_review_run_id !== undefined ||
    source.findings_digest_sha256 !== undefined ||
    source.findings_artifact_status !== undefined ||
    source.findings_parity_status !== undefined;
  return hasFlatClaimFields ? source : undefined;
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

export function resolveFindingsArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  artifactRef: string;
}): string | undefined {
  if (
    !input.artifactRef.startsWith("artifacts/") ||
    input.artifactRef.includes("..") ||
    input.artifactRef.includes("\\") ||
    input.artifactRef.includes("\0")
  ) {
    return undefined;
  }
  const artifactPath = resolve(input.bubbleDir, input.artifactRef);
  const relativeToArtifacts = relative(input.artifactsDir, artifactPath);
  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    return undefined;
  }
  return artifactPath;
}

export async function readMetaReviewReportJsonArtifact(input: {
  artifactPath: string;
  readFileFn?: typeof readFile;
}): Promise<{
  reportJson?: Record<string, unknown>;
  diagnostics: string[];
}> {
  const diagnostics: string[] = [];
  const reader = input.readFileFn ?? readFile;
  let raw: string;
  try {
    raw = await reader(input.artifactPath, "utf8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code !== "ENOENT") {
      diagnostics.push(
        `META_REVIEW_REPORT_JSON_ARTIFACT_READ_DIAGNOSTIC: ${input.artifactPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return { diagnostics };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: ${error instanceof Error ? error.message : String(error)}`
    );
    return { diagnostics };
  }
  if (!isRecord(parsed)) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: top-level JSON value must be an object.`
    );
    return { diagnostics };
  }
  const reportJson = resolveMetaReviewReportJsonObject(parsed);
  if (reportJson === undefined) {
    diagnostics.push(
      `META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC: ${input.artifactPath}: report_json claim object missing.`
    );
    return { diagnostics };
  }
  return { reportJson, diagnostics };
}
