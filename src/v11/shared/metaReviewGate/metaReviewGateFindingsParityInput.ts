import type { MetaReviewRunResult } from "../metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata, FindingsParityStatus } from "../../../types/protocol.js";
import {
  resolveFindingsArtifactPath,
  resolveFindingsArtifactStatus,
  resolveFindingsCountFromMetaReviewReportJson,
  resolveFindingsDigestSha256,
  resolveMetaReviewRunId
} from "./metaReviewGateFindingsMetadata.js";

export const claimStateRequiredReasonCode = "FINDINGS_CLAIM_STATE_REQUIRED";
export const claimSourceInvalidReasonCode = "FINDINGS_CLAIM_SOURCE_INVALID";
export const metaReviewFindingsArtifactRequiredReasonCode =
  "META_REVIEW_FINDINGS_ARTIFACT_REQUIRED";
export const metaReviewFindingsCountMismatchReasonCode =
  "META_REVIEW_FINDINGS_COUNT_MISMATCH";
export const metaReviewFindingsRunLinkMissingReasonCode =
  "META_REVIEW_FINDINGS_RUN_LINK_MISSING";
export const metaReviewFindingsParityGuardReasonCode =
  "META_REVIEW_FINDINGS_PARITY_GUARD";

export interface ReworkFindingsParityInput {
  findingsCount: number;
  artifactPath: string;
  artifactStatus: string;
  digest: string;
  metaReviewRunId: string;
}

export function buildFindingsParityMetadata(input: {
  findingsCount?: number | undefined;
  artifactOpenTotal?: number | null | undefined;
  artifactStatus?: string | undefined;
  digest?: string | undefined;
  metaReviewRunId?: string | undefined;
  parityStatus: FindingsParityStatus;
}): FindingsParityMetadata {
  return {
    findings_claimed_open_total: input.findingsCount ?? null,
    findings_artifact_open_total: input.artifactOpenTotal ?? null,
    findings_artifact_status: input.artifactStatus ?? null,
    findings_digest_sha256: input.digest ?? null,
    meta_review_run_id: input.metaReviewRunId ?? null,
    findings_parity_status: input.parityStatus
  };
}

export function resolveReworkFindingsParityInput(input: {
  reportJson: Record<string, unknown>;
  runResult: MetaReviewRunResult;
  bubbleDir: string;
  artifactsDir: string;
}):
  | { ok: true; value: ReworkFindingsParityInput }
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
  if (input.runResult.run_id !== undefined && metaReviewRunId !== input.runResult.run_id) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsRunLinkMissingReasonCode}: meta_review_run_id (${metaReviewRunId}) must match run_id (${input.runResult.run_id}).`,
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
  const artifactPath = resolveFindingsArtifactPath({
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir,
    artifactRef: normalizedArtifactRef
  });
  if (artifactPath === undefined) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_ref (${normalizedArtifactRef}) must resolve under artifacts/.`,
      metadata: metadata("guard_failed")
    };
  }

  return {
    ok: true,
    value: {
      findingsCount,
      artifactPath,
      artifactStatus,
      digest,
      metaReviewRunId
    }
  };
}
