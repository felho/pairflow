import { createHash } from "node:crypto";
import type { readFile } from "node:fs/promises";

import { isRecord } from "../../../core/validation.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import { type FindingsParityMetadata, type FindingsParityStatus } from "../../../types/protocol.js";
import {
  resolveFindingsArtifactOpenTotalFromArtifact
} from "./metaReviewGateFindingsMetadata.js";
import {
  formatReadErrorDetail,
  readFindingsArtifactWithRetry
} from "./metaReviewGateFindingsArtifactReadRetry.js";
import {
  buildFindingsParityMetadata,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode
} from "./metaReviewGateFindingsParityInput.js";
export {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  metaReviewFindingsRunLinkMissingReasonCode,
  resolveReworkFindingsParityInput,
  type ReworkFindingsParityInput
} from "./metaReviewGateFindingsParityInput.js";

export async function validateFindingsArtifactParity(input: {
  artifactPath: string;
  findingsCount: number;
  digest: string;
  artifactStatus: string;
  metaReviewRunId: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; artifactOpenTotal: number }
  | { ok: false; reason: string; metadata: FindingsParityMetadata }
> {
  const metadata = (
    parityStatus: FindingsParityStatus,
    artifactOpenTotal: number | null
  ): FindingsParityMetadata =>
    buildFindingsParityMetadata({
      findingsCount: input.findingsCount,
      artifactOpenTotal,
      artifactStatus: input.artifactStatus,
      digest: input.digest,
      metaReviewRunId: input.metaReviewRunId,
      parityStatus
    });

  const artifactRead = await readFindingsArtifactWithRetry({
    artifactPath: input.artifactPath,
    readFileFn: input.readFileFn,
    ...(input.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.sleepForRetryMs }
      : {})
  });
  if (!artifactRead.ok) {
    const retryStatus = artifactRead.retried
      ? "transient_retry_exhausted"
      : "non_retryable_or_first_attempt";
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings artifact read failed [${retryStatus}] after ${artifactRead.attempts} attempt(s) (${formatReadErrorDetail(artifactRead.error)}).`,
      metadata: metadata("guard_failed", null)
    };
  }

  let artifactParsed: unknown;
  try {
    artifactParsed = JSON.parse(artifactRead.raw);
  } catch (error) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings artifact parse failed (${error instanceof Error ? error.message : String(error)}).`,
      metadata: metadata("guard_failed", null)
    };
  }
  if (!isRecord(artifactParsed)) {
    return {
      ok: false,
      reason: `${metaReviewFindingsParityGuardReasonCode}: findings artifact must be a JSON object.`,
      metadata: metadata("guard_failed", null)
    };
  }

  const artifactOpenTotal = resolveFindingsArtifactOpenTotalFromArtifact(artifactParsed);
  if (artifactOpenTotal === undefined) {
    return {
      ok: false,
      reason: `${metaReviewFindingsParityGuardReasonCode}: findings artifact open_total is unavailable.`,
      metadata: metadata("guard_failed", null)
    };
  }

  const computedDigest = createHash("sha256")
    .update(artifactRead.raw, "utf8")
    .digest("hex");
  if (computedDigest !== input.digest) {
    return {
      ok: false,
      reason: `${metaReviewFindingsParityGuardReasonCode}: findings artifact digest mismatch.`,
      metadata: metadata("guard_failed", artifactOpenTotal)
    };
  }
  if (input.findingsCount !== artifactOpenTotal) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsCountMismatchReasonCode}: findings_count (${input.findingsCount}) must match findings artifact open_total (${artifactOpenTotal}).`,
      metadata: metadata("mismatch", artifactOpenTotal)
    };
  }

  return { ok: true, artifactOpenTotal };
}

export function isPositiveReworkRecommendation(
  recommendation: MetaReviewRecommendation
): boolean {
  return recommendation === "rework";
}
