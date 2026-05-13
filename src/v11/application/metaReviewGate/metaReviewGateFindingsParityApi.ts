import { createHash } from "node:crypto";

import type { MetaReviewResult } from "../../shared/metaReview/metaReviewTypes.js";
import { isRecord } from "../../shared/validation/primitives.js";
import type {
  FindingsParityMetadata,
  FindingsParityStatus
} from "../../shared/metaReviewGate/findingsParityMetadataContract.js";
import {
  buildFindingsParityMetadata,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  resolveFindingsArtifactOpenTotalFromArtifact
} from "../../domain/metaReviewGate/findingsParityMetadata.js";
import {
  resolveReworkFindingsParityInputCandidate,
  type ReworkFindingsParityInputCandidate
} from "../../domain/metaReviewGate/findingsParityInput.js";
import {
  deriveFindingsOpenSplit,
  type FindingsOpenSplit
} from "../../domain/metaReviewGate/findingsSplit.js";
import {
  formatReadErrorDetail,
  readFindingsArtifactWithRetry
} from "./internal/findings/metaReviewGateFindingsArtifactReadRetry.js";
import {
  resolveFindingsArtifactPath,
  type MetaReviewGateArtifactReadFn
} from "./internal/findings/metaReviewGateFindingsMetadata.js";

export {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  metaReviewFindingsRunLinkMissingReasonCode
} from "../../domain/metaReviewGate/findingsParityMetadata.js";

export interface ReworkFindingsParityInput
  extends ReworkFindingsParityInputCandidate {
  artifactPath: string;
}

export function resolveReworkFindingsParityInput(input: {
  reportJson: Record<string, unknown>;
  runResult: MetaReviewResult;
  bubbleDir: string;
  artifactsDir: string;
}):
  | { ok: true; value: ReworkFindingsParityInput }
  | { ok: false; reason: string; metadata: FindingsParityMetadata } {
  const candidate = resolveReworkFindingsParityInputCandidate({
    reportJson: input.reportJson,
    runId: input.runResult.run_id
  });
  if (!candidate.ok) {
    return candidate;
  }

  const artifactPath = resolveFindingsArtifactPath({
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir,
    artifactRef: candidate.value.artifactRef
  });
  if (artifactPath === undefined) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_ref (${candidate.value.artifactRef}) must resolve under artifacts/.`,
      metadata: buildFindingsParityMetadata({
        findingsCount: candidate.value.findingsCount,
        artifactOpenTotal: null,
        artifactStatus: candidate.value.artifactStatus,
        digest: candidate.value.digest,
        metaReviewRunId: candidate.value.metaReviewRunId,
        parityStatus: "guard_failed"
      })
    };
  }

  return {
    ok: true,
    value: {
      ...candidate.value,
      artifactPath
    }
  };
}

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
  const parsedSplit = deriveFindingsOpenSplit(artifactParsed.findings);

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
