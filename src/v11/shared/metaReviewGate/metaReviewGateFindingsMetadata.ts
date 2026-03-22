import { isRecord } from "../../../core/validation.js";
import { resolveFindingPriority } from "../../../types/findings.js";
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

function resolveNonNegativeIntegerOrNull(
  value: unknown
): number | null {
  return isNonNegativeInteger(value) ? value : null;
}

export interface FindingsOpenSplit {
  blockingOpenTotal: number;
  advisoryOpenTotal: number;
}

export interface MetaReviewGateAdvisoryFinding {
  severity: "P2" | "P3";
  title: string;
  refs?: string[];
}

export function deriveFindingsOpenSplit(findings: unknown): FindingsOpenSplit | null {
  if (!Array.isArray(findings)) {
    return null;
  }

  let blockingOpenTotal = 0;
  let advisoryOpenTotal = 0;
  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }
    const priority = resolveFindingPriority({
      priority: entry.priority,
      severity: entry.severity
    });
    if (priority === "P0" || priority === "P1") {
      blockingOpenTotal += 1;
      continue;
    }
    if (priority === "P2" || priority === "P3") {
      advisoryOpenTotal += 1;
    }
  }

  return {
    blockingOpenTotal,
    advisoryOpenTotal
  };
}

export function resolveFindingsOpenSplitFromFindings(
  findings: unknown
): {
  findings_blocking_open_total: number;
  findings_advisory_open_total: number;
} | null {
  const derived = deriveFindingsOpenSplit(findings);
  if (derived === null) {
    return null;
  }
  return {
    findings_blocking_open_total: derived.blockingOpenTotal,
    findings_advisory_open_total: derived.advisoryOpenTotal
  };
}

export function resolveFindingsOpenSplitFromReportJson(
  reportJson: Record<string, unknown>
): {
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
} {
  const derived = resolveFindingsOpenSplitFromFindings(reportJson.findings);
  const explicitBlocking = resolveNonNegativeIntegerOrNull(
    reportJson.findings_blocking_open_total
  );
  const explicitAdvisory = resolveNonNegativeIntegerOrNull(
    reportJson.findings_advisory_open_total
  );

  return {
    findings_blocking_open_total:
      explicitBlocking ?? derived?.findings_blocking_open_total ?? null,
    findings_advisory_open_total:
      explicitAdvisory ?? derived?.findings_advisory_open_total ?? null
  };
}

function resolveOptionalFindingRefs(entry: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(entry.refs)) {
    return undefined;
  }
  const refs = entry.refs
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return refs.length > 0 ? refs : undefined;
}

export function resolveAdvisoryFindingsFromFindings(
  findings: unknown
): MetaReviewGateAdvisoryFinding[] | undefined {
  if (!Array.isArray(findings)) {
    return undefined;
  }
  const advisoryFindings: MetaReviewGateAdvisoryFinding[] = [];
  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }
    const priority = resolveFindingPriority({
      priority: entry.priority,
      severity: entry.severity
    });
    if (priority !== "P2" && priority !== "P3") {
      continue;
    }
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    if (title.length === 0) {
      continue;
    }
    const refs = resolveOptionalFindingRefs(entry);
    advisoryFindings.push({
      severity: priority,
      title,
      ...(refs !== undefined ? { refs } : {})
    });
  }
  return advisoryFindings.length > 0 ? advisoryFindings : undefined;
}

export function resolveAdvisoryFindingsFromReportJson(
  reportJson: Record<string, unknown> | undefined
): MetaReviewGateAdvisoryFinding[] | undefined {
  if (reportJson === undefined) {
    return undefined;
  }
  return resolveAdvisoryFindingsFromFindings(reportJson.findings);
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
  const findingsOpenSplit = resolveFindingsOpenSplitFromReportJson(reportJson);
  return {
    findings_claimed_open_total: claimCount ?? null,
    findings_artifact_open_total: artifactCount,
    findings_blocking_open_total: findingsOpenSplit.findings_blocking_open_total,
    findings_advisory_open_total: findingsOpenSplit.findings_advisory_open_total,
    findings_artifact_status: resolveFindingsArtifactStatus(reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(reportJson) ?? null,
    findings_parity_status: resolveFindingsParityStatus(reportJson)
  };
}
