import { isAbsolute, relative, resolve } from "node:path";

import { isRecord } from "../validation/primitives.js";
import {
  type FindingsParityMetadata,
  type FindingsParityStatus
} from "../../../types/protocol.js";
import {
  resolveFindingsCountFromMetaReviewReportJson as resolveFindingsCountFromMetaReviewReportJsonImpl,
  resolveNonNegativeIntegerField as resolveNonNegativeIntegerFieldImpl
} from "../../domain/metaReviewGate/findingsClaimParsing.js";
import {
  deriveFindingsOpenSplit,
  resolveFindingsOpenSplitFromReportJson
} from "./metaReviewGateFindingsSplit.js";
export type MetaReviewGateArtifactReadFn = (
  artifactPath: string,
  encoding: "utf8"
) => Promise<string>;
export {
  type LatestSameRoundReviewerSnapshot,
  isReviewerSnapshotEnvelope,
  readLatestSameRoundReviewerSnapshotFromTranscript,
  resolveLatestSameRoundReviewerSnapshot,
  resolveReviewerSnapshotMetadataAdvisoryOpenTotal,
  resolveSameRoundReviewerSnapshotFromEnvelope
} from "./metaReviewGateReviewerSnapshot.js";
export {
  resolveFindingsCountFromMetaReviewReportJson,
  resolveNonNegativeIntegerField
} from "../../domain/metaReviewGate/findingsClaimParsing.js";
export {
  resolveStructuredMetaReviewClaimFromReportJson
} from "../../domain/metaReviewGate/findingsClaimParsing.js";

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
  const derived = deriveFindingsOpenSplit(artifact.findings);
  if (derived !== null) {
    return derived.blockingOpenTotal + derived.advisoryOpenTotal;
  }
  return undefined;
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
  const explicitClaimedCount = resolveNonNegativeIntegerFieldImpl(
    reportJson,
    "findings_claimed_open_total"
  );
  const derivedClaimCount = resolveFindingsCountFromMetaReviewReportJsonImpl(reportJson);
  const claimCount = explicitClaimedCount === undefined
    ? (derivedClaimCount ?? null)
    : explicitClaimedCount;
  const artifactCount = resolveNonNegativeIntegerFieldImpl(
    reportJson,
    "findings_artifact_open_total"
  );
  const findingsOpenSplit = resolveFindingsOpenSplitFromReportJson(reportJson);
  return {
    findings_claimed_open_total: claimCount,
    findings_artifact_open_total: artifactCount ?? null,
    findings_blocking_open_total: findingsOpenSplit.findings_blocking_open_total,
    findings_advisory_open_total: findingsOpenSplit.findings_advisory_open_total,
    findings_artifact_status: resolveFindingsArtifactStatus(reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(reportJson) ?? null,
    findings_parity_status: resolveFindingsParityStatus(reportJson)
  };
}
