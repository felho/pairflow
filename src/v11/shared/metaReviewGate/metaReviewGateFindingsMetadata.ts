import { isRecord } from "../validation/primitives.js";
import { readTranscriptEnvelopes } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  type ProtocolEnvelope,
  type FindingsParityMetadata,
  type FindingsParityStatus
} from "../../../types/protocol.js";
import {
  resolveFindingsCountFromMetaReviewReportJson,
  resolveNonNegativeIntegerField
} from "./metaReviewGateFindingsClaimParsing.js";
import {
  type MetaReviewGateAdvisoryFinding,
  deriveFindingsOpenSplit,
  resolveAdvisoryFindingsFromFindings,
  resolveFindingsOpenSplitFromReportJson
} from "./metaReviewGateFindingsSplit.js";
export {
  readMetaReviewReportJsonArtifact,
  resolveFindingsArtifactPath
} from "./metaReviewGateFindingsArtifactJson.js";
export {
  resolveFindingsCountFromMetaReviewReportJson,
  resolveNonNegativeIntegerField,
  resolveStructuredMetaReviewClaimFromReportJson
} from "./metaReviewGateFindingsClaimParsing.js";

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export interface LatestSameRoundReviewerSnapshot {
  envelopeId: string;
  round: number;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_open_total: number | null;
  advisoryFindings: MetaReviewGateAdvisoryFinding[] | undefined;
}

function resolveReviewerSnapshotMetadataAdvisoryOpenTotal(
  envelope: ProtocolEnvelope
): number | null {
  if (!isRecord(envelope.payload.metadata)) {
    return null;
  }
  const advisoryOpenTotal = envelope.payload.metadata.advisory_findings_open_total;
  return isNonNegativeInteger(advisoryOpenTotal) ? advisoryOpenTotal : null;
}

function isReviewerSnapshotEnvelope(envelope: ProtocolEnvelope): boolean {
  return (
    envelope.type === "CONVERGENCE" &&
    envelope.recipient === "orchestrator"
  );
}

export function resolveSameRoundReviewerSnapshotFromEnvelope(
  envelope: ProtocolEnvelope
): LatestSameRoundReviewerSnapshot | null {
  if (!isReviewerSnapshotEnvelope(envelope)) {
    return null;
  }

  const advisoryFindings = resolveAdvisoryFindingsFromFindings(
    envelope.payload.findings
  );
  const derivedSplit = deriveFindingsOpenSplit(envelope.payload.findings);
  const metadataAdvisoryOpenTotal =
    resolveReviewerSnapshotMetadataAdvisoryOpenTotal(envelope);
  const advisoryOpenTotal =
    metadataAdvisoryOpenTotal ?? derivedSplit?.advisoryOpenTotal ?? null;
  const blockingOpenTotal =
    derivedSplit?.blockingOpenTotal ?? (metadataAdvisoryOpenTotal !== null ? 0 : null);
  const openFindingsTotal =
    advisoryOpenTotal !== null || blockingOpenTotal !== null
      ? (advisoryOpenTotal ?? 0) + (blockingOpenTotal ?? 0)
      : null;

  return {
    envelopeId: envelope.id,
    round: envelope.round,
    findings_blocking_open_total: blockingOpenTotal,
    findings_advisory_open_total: advisoryOpenTotal,
    findings_open_total: openFindingsTotal,
    advisoryFindings
  };
}

export function resolveLatestSameRoundReviewerSnapshot(
  transcript: readonly ProtocolEnvelope[],
  round: number
): LatestSameRoundReviewerSnapshot | undefined {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index];
    if (envelope === undefined || envelope.round !== round) {
      continue;
    }
    const snapshot = resolveSameRoundReviewerSnapshotFromEnvelope(envelope);
    if (snapshot !== null) {
      return snapshot;
    }
  }
  return undefined;
}

export async function readLatestSameRoundReviewerSnapshotFromTranscript(
  transcriptPath: string,
  round: number,
  dependencies: {
    readTranscriptEnvelopes?: typeof readTranscriptEnvelopes;
  } = {}
): Promise<LatestSameRoundReviewerSnapshot | undefined> {
  const readTranscript =
    dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes;
  const transcript = await readTranscript(transcriptPath, {
    allowMissing: true
  });
  return resolveLatestSameRoundReviewerSnapshot(transcript, round);
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
  const explicitClaimedCount = resolveNonNegativeIntegerField(
    reportJson,
    "findings_claimed_open_total"
  );
  const derivedClaimCount = resolveFindingsCountFromMetaReviewReportJson(reportJson);
  const claimCount = explicitClaimedCount === undefined
    ? (derivedClaimCount ?? null)
    : explicitClaimedCount;
  const artifactCount = resolveNonNegativeIntegerField(
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
