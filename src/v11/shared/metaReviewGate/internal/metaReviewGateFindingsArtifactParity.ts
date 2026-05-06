import { createHash } from "node:crypto";

import { isRecord } from "../../validation/primitives.js";
import { type FindingsParityMetadata, type FindingsParityStatus } from "../../../../types/protocol.js";
import {
  deriveFindingsOpenSplit,
  type FindingsOpenSplit
} from "../../../domain/metaReviewGate/findingsSplit.js";
import { resolveFindingsArtifactOpenTotalFromArtifact } from "./metaReviewGateFindingsMetadata.js";
import {
  formatReadErrorDetail,
  readFindingsArtifactWithRetry
} from "./metaReviewGateFindingsArtifactReadRetry.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";
import {
  buildFindingsParityMetadata,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode
} from "./metaReviewGateFindingsParityInput.js";

export async function validateFindingsArtifactParity(input: {
  artifactPath: string;
  findingsCount: number;
  digest: string;
  artifactStatus: string;
  metaReviewRunId: string;
  readFileFn: MetaReviewGateArtifactReadFn;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | {
      ok: true;
      artifactOpenTotal: number;
      artifact: Record<string, unknown>;
      split: FindingsOpenSplit | null;
    }
  | { ok: false; reason: string; metadata: FindingsParityMetadata }
> {
  const buildMetadata = (inputMetadata: {
    parityStatus: FindingsParityStatus;
    artifactOpenTotal: number | null;
    split: FindingsOpenSplit | null;
  }): FindingsParityMetadata => ({
    ...buildFindingsParityMetadata({
      findingsCount: input.findingsCount,
      artifactOpenTotal: inputMetadata.artifactOpenTotal,
      artifactStatus: input.artifactStatus,
      digest: input.digest,
      metaReviewRunId: input.metaReviewRunId,
      parityStatus: inputMetadata.parityStatus
    }),
    findings_blocking_open_total: inputMetadata.split?.blockingOpenTotal ?? null,
    findings_advisory_open_total: inputMetadata.split?.advisoryOpenTotal ?? null
  });

  const guardFailedMetadata = (): FindingsParityMetadata =>
    buildMetadata({
      parityStatus: "guard_failed",
      artifactOpenTotal: null,
      split: null
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
      metadata: guardFailedMetadata()
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
      metadata: guardFailedMetadata()
    };
  }
  if (!isRecord(artifactParsed)) {
    return {
      ok: false,
      reason: `${metaReviewFindingsParityGuardReasonCode}: findings artifact must be a JSON object.`,
      metadata: guardFailedMetadata()
    };
  }
  const parsedSplit = deriveFindingsOpenSplit(
    artifactParsed.findings
  );

  const artifactOpenTotal = resolveFindingsArtifactOpenTotalFromArtifact(artifactParsed);
  if (artifactOpenTotal === undefined) {
    return {
      ok: false,
      reason: `${metaReviewFindingsParityGuardReasonCode}: findings artifact open_total is unavailable.`,
      metadata: buildMetadata({
        parityStatus: "guard_failed",
        artifactOpenTotal: null,
        split: parsedSplit
      })
    };
  }

  const computedDigest = createHash("sha256")
    .update(artifactRead.raw, "utf8")
    .digest("hex");
  if (computedDigest !== input.digest) {
    return {
      ok: false,
      reason: `${metaReviewFindingsParityGuardReasonCode}: findings artifact digest mismatch.`,
      metadata: buildMetadata({
        parityStatus: "guard_failed",
        artifactOpenTotal,
        split: parsedSplit
      })
    };
  }
  if (input.findingsCount !== artifactOpenTotal) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsCountMismatchReasonCode}: findings_count (${input.findingsCount}) must match findings artifact open_total (${artifactOpenTotal}).`,
      metadata: buildMetadata({
        parityStatus: "mismatch",
        artifactOpenTotal,
        split: parsedSplit
      })
    };
  }

  return {
    ok: true,
    artifactOpenTotal,
    artifact: artifactParsed,
    split: parsedSplit
  };
}
