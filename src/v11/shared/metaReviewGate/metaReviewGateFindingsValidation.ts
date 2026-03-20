import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { resolveLegacySummaryFindingsClaimState } from "../../../core/convergence/policy.js";
import { isRecord } from "../../../core/validation.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import { type FindingsParityMetadata, type FindingsParityStatus } from "../../../types/protocol.js";
import {
  resolveFindingsArtifactOpenTotalFromArtifact,
  resolveFindingsArtifactPath,
  resolveFindingsArtifactStatus,
  resolveFindingsCountFromMetaReviewReportJson,
  resolveFindingsDigestSha256,
  resolveMetaReviewRunId,
  resolveStructuredMetaReviewClaimFromReportJson
} from "./metaReviewGateFindingsMetadata.js";

const claimStateRequiredReasonCode = "FINDINGS_CLAIM_STATE_REQUIRED";
const claimSourceInvalidReasonCode = "FINDINGS_CLAIM_SOURCE_INVALID";
const metaReviewFindingsArtifactRequiredReasonCode =
  "META_REVIEW_FINDINGS_ARTIFACT_REQUIRED";
const metaReviewFindingsCountMismatchReasonCode =
  "META_REVIEW_FINDINGS_COUNT_MISMATCH";
const metaReviewFindingsRunLinkMissingReasonCode =
  "META_REVIEW_FINDINGS_RUN_LINK_MISSING";
const metaReviewFindingsParityGuardReasonCode =
  "META_REVIEW_FINDINGS_PARITY_GUARD";

const findingsArtifactReadRetryableErrorCodes = new Set([
  "ENOENT",
  "ESTALE",
  "EAGAIN",
  "EBUSY",
  "ETIMEDOUT"
]);
const findingsArtifactReadMaxAttempts = 3;
const findingsArtifactReadRetryBaseDelayMs = 25;
const findingsArtifactReadRetryMaxDelayMs = 75;

function resolveFindingsArtifactReadRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(findingsArtifactReadRetryMaxDelayMs, findingsArtifactReadRetryBaseDelayMs * (2 ** exponent));
}

async function defaultSleepForRetryMs(delayMs: number): Promise<void> {
  await new Promise<void>((resolveDelay) => {
    setTimeout(resolveDelay, delayMs);
  });
}

function isRetryableFindingsArtifactReadError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return (
    typeof code === "string" &&
    findingsArtifactReadRetryableErrorCodes.has(code.trim().toUpperCase())
  );
}

function formatReadErrorDetail(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return `${code.trim().toUpperCase()}: ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

async function readFindingsArtifactWithRetry(input: {
  artifactPath: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; raw: string; attempts: number }
  | { ok: false; error: unknown; attempts: number; retried: boolean }
> {
  let attempts = 0;
  let lastError: unknown = new Error("unknown findings artifact read error");

  while (attempts < findingsArtifactReadMaxAttempts) {
    attempts += 1;
    try {
      const raw = await input.readFileFn(input.artifactPath, "utf8");
      return { ok: true, raw, attempts };
    } catch (error) {
      lastError = error;
      if (
        !isRetryableFindingsArtifactReadError(error) ||
        attempts >= findingsArtifactReadMaxAttempts
      ) {
        return {
          ok: false,
          error,
          attempts,
          retried: attempts > 1
        };
      }
      const retryDelayMs = resolveFindingsArtifactReadRetryDelayMs(attempts);
      const sleepForRetryMs = input.sleepForRetryMs ?? defaultSleepForRetryMs;
      await sleepForRetryMs(retryDelayMs);
    }
  }

  return {
    ok: false,
    error: lastError,
    attempts,
    retried: attempts > 1
  };
}

type StructuredClaimValidationPreflight =
  | { kind: "pass" }
  | { kind: "fail"; reason: string }
  | { kind: "rework"; reportJson: Record<string, unknown> };

interface ReworkFindingsParityInput {
  findingsCount: number;
  artifactPath: string;
  artifactStatus: string;
  digest: string;
  metaReviewRunId: string;
}

function failStructuredMetaReviewPositiveClaim(
  reason: string,
  metadata: FindingsParityMetadata | null = null
): { ok: false; reason: string; metadata: FindingsParityMetadata | null } {
  return { ok: false, reason, metadata };
}

function buildFindingsParityMetadata(input: {
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

function validateStructuredMetaReviewClaimPreflight(input: {
  recommendation: MetaReviewRecommendation;
  reportJson?: Record<string, unknown>;
}): StructuredClaimValidationPreflight {
  if (input.reportJson === undefined) {
    if (input.recommendation !== "rework") {
      return { kind: "pass" };
    }
    return {
      kind: "fail",
      reason:
        `${metaReviewFindingsArtifactRequiredReasonCode}: structured report_json is required for positive meta-review claim parity.`
    };
  }

  const claimResolution = resolveStructuredMetaReviewClaimFromReportJson({
    reportJson: input.reportJson
  });
  if ("reason" in claimResolution) {
    return { kind: "fail", reason: claimResolution.reason };
  }
  if (input.recommendation !== "rework") {
    if (claimResolution.claim?.state === "open_findings") {
      return {
        kind: "fail",
        reason:
          `${claimSourceInvalidReasonCode}: recommendation=${input.recommendation} cannot carry findings_claim_state=open_findings.`
      };
    }
    return { kind: "pass" };
  }
  if (claimResolution.claim === undefined) {
    return {
      kind: "fail",
      reason:
        `${claimStateRequiredReasonCode}: recommendation=rework requires report_json findings_claim_state/findings_claim_source.`
    };
  }
  if (claimResolution.claim.state === "unknown") {
    return {
      kind: "fail",
      reason:
        `${claimStateRequiredReasonCode}: positive meta-review claim cannot remain unknown.`
    };
  }
  if (claimResolution.claim.state !== "open_findings") {
    return {
      kind: "fail",
      reason:
        `${claimSourceInvalidReasonCode}: recommendation=rework requires findings_claim_state=open_findings (found ${claimResolution.claim.state}).`
    };
  }
  return { kind: "rework", reportJson: input.reportJson };
}

function resolveReworkFindingsParityInput(input: {
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

async function validateFindingsArtifactParity(input: {
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

export async function validateStructuredMetaReviewPositiveClaim(input: {
  runResult: MetaReviewRunResult;
  reportJson?: Record<string, unknown>;
  bubbleDir: string;
  artifactsDir: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; diagnostics: string[]; metadata: FindingsParityMetadata | null }
  | { ok: false; reason: string; metadata: FindingsParityMetadata | null }
> {
  const recommendation = input.runResult.recommendation;
  const preflight = validateStructuredMetaReviewClaimPreflight({
    recommendation,
    ...(input.reportJson !== undefined ? { reportJson: input.reportJson } : {})
  });
  if (preflight.kind === "fail") {
    return failStructuredMetaReviewPositiveClaim(preflight.reason);
  }
  if (preflight.kind === "pass") {
    return { ok: true, diagnostics: [], metadata: null };
  }

  const parityInput = resolveReworkFindingsParityInput({
    reportJson: preflight.reportJson,
    runResult: input.runResult,
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir
  });
  if (!parityInput.ok) {
    return failStructuredMetaReviewPositiveClaim(
      parityInput.reason,
      parityInput.metadata
    );
  }

  const artifactParity = await validateFindingsArtifactParity({
    artifactPath: parityInput.value.artifactPath,
    findingsCount: parityInput.value.findingsCount,
    digest: parityInput.value.digest,
    artifactStatus: parityInput.value.artifactStatus,
    metaReviewRunId: parityInput.value.metaReviewRunId,
    readFileFn: input.readFileFn,
    ...(input.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.sleepForRetryMs }
      : {})
  });
  if (!artifactParity.ok) {
    return failStructuredMetaReviewPositiveClaim(
      artifactParity.reason,
      artifactParity.metadata
    );
  }

  const parserState = resolveLegacySummaryFindingsClaimState(
    input.runResult.summary ?? undefined
  );
  const diagnostics = parserState === "open_findings"
    ? []
    : [
        `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC: parser_state=${parserState} structured_state=open_findings structured_source=meta_review_artifact`
      ];

  return {
    ok: true,
    diagnostics,
    metadata: buildFindingsParityMetadata({
      findingsCount: parityInput.value.findingsCount,
      artifactOpenTotal: artifactParity.artifactOpenTotal,
      artifactStatus: parityInput.value.artifactStatus,
      digest: parityInput.value.digest,
      metaReviewRunId: parityInput.value.metaReviewRunId,
      parityStatus: "ok"
    })
  };
}
