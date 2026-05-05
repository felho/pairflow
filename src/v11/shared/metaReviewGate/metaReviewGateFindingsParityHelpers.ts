import { createHash } from "node:crypto";

import { isRecord } from "../validation/primitives.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming,
  type Finding
} from "../../../types/findings.js";
import { type FindingsParityMetadata, type FindingsParityStatus } from "../../../types/protocol.js";
import {
  deriveFindingsOpenSplit as deriveFindingsOpenSplitFromMetadata,
  type FindingsOpenSplit
} from "./metaReviewGateFindingsSplit.js";
import {
  resolveFindingsArtifactOpenTotalFromArtifact
} from "./metaReviewGateFindingsMetadata.js";
import {
  formatReadErrorDetail,
  readFindingsArtifactWithRetry
} from "./internal/metaReviewGateFindingsArtifactReadRetry.js";
import type {
  MetaReviewGateArtifactReadFn
} from "./metaReviewGateFindingsMetadata.js";
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

export function deriveFindingsOpenSplit(
  findings: unknown
): FindingsOpenSplit | null {
  return deriveFindingsOpenSplitFromMetadata(findings);
}

function resolveStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function resolveEvidenceValue(value: unknown): string | string[] | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return resolveStringArray(value);
}

function resolveProjectedSeverity(entry: Record<string, unknown>) {
  if (isFindingSeverity(entry.severity)) {
    return entry.severity;
  }
  if (isFindingPriority(entry.priority)) {
    return entry.priority;
  }
  return undefined;
}

// This projection intentionally collapses three artifact states to "no payload findings":
// non-array findings input, empty findings array, and arrays whose entries all fail the
// displayable-finding contract. The protocol only distinguishes presence vs absence here.
export function projectDisplayableFindingsFromArtifact(
  findings: unknown
): Finding[] | undefined {
  if (!Array.isArray(findings)) {
    return undefined;
  }

  const projected: Finding[] = [];
  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }

    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    if (title.length === 0) {
      continue;
    }

    const severity = resolveProjectedSeverity(entry);
    if (severity === undefined) {
      continue;
    }

    const priority = isFindingPriority(entry.priority) ? entry.priority : undefined;
    const finding: Finding = {
      title,
      severity,
      ...(priority !== undefined ? { priority } : {})
    };

    if (typeof entry.detail === "string" && entry.detail.trim().length > 0) {
      finding.detail = entry.detail;
    }
    if (typeof entry.code === "string" && entry.code.trim().length > 0) {
      finding.code = entry.code;
    }
    const refs = resolveStringArray(entry.refs);
    if (refs !== undefined) {
      finding.refs = refs;
    }
    if (isFindingTiming(entry.timing)) {
      finding.timing = entry.timing;
    }
    if (isFindingLayer(entry.layer)) {
      finding.layer = entry.layer;
    }
    const evidence = resolveEvidenceValue(entry.evidence);
    if (evidence !== undefined) {
      finding.evidence = evidence;
    }
    if (isFindingPriority(entry.effective_priority)) {
      finding.effective_priority = entry.effective_priority;
    }

    projected.push(finding);
  }

  return projected.length > 0 ? projected : undefined;
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

export function isPositiveReworkRecommendation(
  recommendation: MetaReviewRecommendation
): boolean {
  return recommendation === "rework";
}
