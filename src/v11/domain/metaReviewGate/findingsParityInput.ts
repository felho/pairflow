import type { FindingsParityMetadata, FindingsParityStatus } from "../../shared/metaReviewGate/findingsParityMetadataContract.js";
import {
  buildFindingsParityMetadata,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  metaReviewFindingsRunLinkMissingReasonCode,
  resolveFindingsArtifactStatus,
  resolveFindingsCountFromMetaReviewReportJson,
  resolveFindingsDigestSha256,
  resolveMetaReviewRunId
} from "./findingsParityMetadata.js";

export interface ReworkFindingsParityInputCandidate {
  findingsCount: number;
  artifactRef: string;
  artifactStatus: string;
  digest: string;
  metaReviewRunId: string;
}

export function resolveReworkFindingsParityInputCandidate(input: {
  reportJson: Record<string, unknown>;
  runId?: string | undefined;
}):
  | { ok: true; value: ReworkFindingsParityInputCandidate }
  | { ok: false; reason: string; metadata: FindingsParityMetadata } {
  const findingsCount = resolveFindingsCountFromMetaReviewReportJson(input.reportJson);
  const artifactStatus = resolveFindingsArtifactStatus(input.reportJson);
  const digest = resolveFindingsDigestSha256(input.reportJson);
  const metaReviewRunId = resolveMetaReviewRunId(input.reportJson);

  const metadata = (parityStatus: FindingsParityStatus): FindingsParityMetadata =>
    buildFindingsParityMetadata({
      findingsCount,
      artifactOpenTotal: null,
      artifactStatus,
      digest,
      metaReviewRunId,
      parityStatus
    });

  if (findingsCount === undefined || findingsCount <= 0) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsCountMismatchReasonCode}: recommendation=rework requires findings_count>0 in report_json.`,
      metadata: metadata("mismatch")
    };
  }

  const artifactRef = input.reportJson.findings_artifact_ref;
  if (typeof artifactRef !== "string" || artifactRef.trim().length === 0) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsArtifactRequiredReasonCode}: recommendation=rework requires non-empty findings_artifact_ref in report_json.`,
      metadata: metadata("guard_failed")
    };
  }
  if (metaReviewRunId === undefined) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsRunLinkMissingReasonCode}: recommendation=rework requires non-empty meta_review_run_id in report_json.`,
      metadata: metadata("guard_failed")
    };
  }
  if (input.runId !== undefined && metaReviewRunId !== input.runId) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsRunLinkMissingReasonCode}: meta_review_run_id (${metaReviewRunId}) must match run_id (${input.runId}).`,
      metadata: metadata("guard_failed")
    };
  }
  if (digest === undefined) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: recommendation=rework requires findings_digest_sha256 parity metadata.`,
      metadata: metadata("guard_failed")
    };
  }
  if (artifactStatus === undefined) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: recommendation=rework requires findings_artifact_status parity metadata.`,
      metadata: metadata("guard_failed")
    };
  }

  const normalizedArtifactRef = artifactRef.trim();
  if (!normalizedArtifactRef.endsWith(".json")) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_ref (${normalizedArtifactRef}) must reference a JSON artifact.`,
      metadata: metadata("guard_failed")
    };
  }

  return {
    ok: true,
    value: {
      findingsCount,
      artifactRef: normalizedArtifactRef,
      artifactStatus,
      digest,
      metaReviewRunId
    }
  };
}
