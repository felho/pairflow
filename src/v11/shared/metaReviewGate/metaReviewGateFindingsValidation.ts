import type { readFile } from "node:fs/promises";

import {
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion,
  resolveLegacySummaryFindingsClaimState
} from "../../../core/convergence/policy.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import { type FindingsParityMetadata } from "../../../types/protocol.js";
import {
  resolveFindingsArtifactStatus,
  resolveFindingsDigestSha256,
  resolveMetaReviewRunId,
  resolveStructuredMetaReviewClaimFromReportJson
} from "./metaReviewGateFindingsMetadata.js";
import { resolveNonNegativeIntegerField } from "./metaReviewGateFindingsClaimParsing.js";
import {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  resolveReworkFindingsParityInput,
  validateFindingsArtifactParity
} from "./metaReviewGateFindingsParityHelpers.js";

export const metaReviewSummaryStructuredMismatchReasonCode =
  "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH";
export const metaReviewApproveBlockingFindingsPresentReasonCode =
  "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT";
export const metaReviewApproveAdvisoryOnlyReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_ONLY";
export const metaReviewApproveAdvisorySplitRequiredReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED";
export const metaReviewApproveAdvisorySplitFormatInvalidReasonCode =
  "META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID";

type StructuredClaimValidationPreflight =
  | { kind: "pass" }
  | { kind: "fail"; reason: string }
  | { kind: "rework"; reportJson: Record<string, unknown> }
  | {
      kind: "approve";
      reportJson: Record<string, unknown>;
      claimState: "clean" | "open_findings";
    };

interface ApproveSplitTriplet {
  claimed: number;
  blocking: number;
  advisory: number;
}

type ApproveSplitTripletResolution =
  | { ok: true; value: ApproveSplitTriplet }
  | { ok: false; reason: string };

type ApproveClaimValidationResult =
  | {
      ok: true;
      diagnostics: string[];
      metadata: FindingsParityMetadata;
    }
  | {
      ok: false;
      reason: string;
      metadata: FindingsParityMetadata;
    };

function failStructuredMetaReviewPositiveClaim(
  reason: string,
  metadata: FindingsParityMetadata | null = null
): { ok: false; reason: string; metadata: FindingsParityMetadata | null } {
  return { ok: false, reason, metadata };
}

function resolveApproveSplitTriplet(
  reportJson: Record<string, unknown>
): ApproveSplitTripletResolution {
  const claimed = resolveNonNegativeIntegerField(
    reportJson,
    "findings_claimed_open_total"
  );
  const blocking = resolveNonNegativeIntegerField(
    reportJson,
    "findings_blocking_open_total"
  );
  const advisory = resolveNonNegativeIntegerField(
    reportJson,
    "findings_advisory_open_total"
  );
  const missing: string[] = [];
  if (claimed === undefined) {
    missing.push("findings_claimed_open_total");
  }
  if (blocking === undefined) {
    missing.push("findings_blocking_open_total");
  }
  if (advisory === undefined) {
    missing.push("findings_advisory_open_total");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      reason:
        `${metaReviewApproveAdvisorySplitRequiredReasonCode}: recommendation=approve requires split fields (${missing.join(", ")}).`
    };
  }
  const invalid: string[] = [];
  if (claimed === null) {
    invalid.push("findings_claimed_open_total");
  }
  if (blocking === null) {
    invalid.push("findings_blocking_open_total");
  }
  if (advisory === null) {
    invalid.push("findings_advisory_open_total");
  }
  if (invalid.length > 0) {
    return {
      ok: false,
      reason:
        `${metaReviewApproveAdvisorySplitFormatInvalidReasonCode}: recommendation=approve split fields must be non-negative integers (${invalid.join(", ")}).`
    };
  }
  return {
    ok: true,
    value: {
      claimed: claimed as number,
      blocking: blocking as number,
      advisory: advisory as number
    }
  };
}

function hasNonEmptySummary(summary: string | null | undefined): summary is string {
  return typeof summary === "string" && summary.trim().length > 0;
}

function resolveApproveSummaryStructuredMismatch(input: {
  summary: string | null | undefined;
  split: ApproveSplitTriplet;
}): string | null {
  if (!hasNonEmptySummary(input.summary)) {
    return null;
  }

  const positiveAssertion = evaluatePositiveSummaryFindingsAssertion(input.summary);
  if (positiveAssertion.hasPositiveAssertion && input.split.claimed === 0) {
    return (
      `${metaReviewSummaryStructuredMismatchReasonCode}: summary claims open findings while structured split claims 0 open findings.`
    );
  }

  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  if (noFindingsAssertion.hasNoFindingsAssertion && input.split.claimed > 0) {
    const advisoryOnlyOpenFindings =
      input.split.blocking === 0
      && input.split.advisory === input.split.claimed;
    if (
      advisoryOnlyOpenFindings &&
      !hasGlobalNoFindingsSummaryAssertion(input.summary)
    ) {
      return null;
    }
    return (
      `${metaReviewSummaryStructuredMismatchReasonCode}: summary claims no findings while structured split claims open findings.`
    );
  }

  return null;
}

function buildApproveParityMetadata(input: {
  reportJson: Record<string, unknown>;
  split: ApproveSplitTriplet;
  artifactOpenTotal: number | null | undefined;
}): FindingsParityMetadata {
  const normalizedArtifactOpenTotal: number | null =
    typeof input.artifactOpenTotal === "number" ? input.artifactOpenTotal : null;
  const hasVerifiedArtifactOpenTotal = normalizedArtifactOpenTotal !== null;
  return {
    findings_claimed_open_total: input.split.claimed,
    findings_artifact_open_total: normalizedArtifactOpenTotal,
    findings_blocking_open_total: input.split.blocking,
    findings_advisory_open_total: input.split.advisory,
    findings_artifact_status: resolveFindingsArtifactStatus(input.reportJson) ?? null,
    findings_digest_sha256: resolveFindingsDigestSha256(input.reportJson) ?? null,
    meta_review_run_id: resolveMetaReviewRunId(input.reportJson) ?? null,
    findings_parity_status: hasVerifiedArtifactOpenTotal ? "ok" : null
  };
}

function validateApproveStructuredMetaReviewClaim(input: {
  runResult: MetaReviewRunResult;
  reportJson: Record<string, unknown>;
  claimState: "clean" | "open_findings";
}): ApproveClaimValidationResult {
  const splitResolution = resolveApproveSplitTriplet(input.reportJson);
  if (!splitResolution.ok) {
    return {
      ok: false,
      reason: splitResolution.reason,
      metadata: {
        findings_claimed_open_total: null,
        findings_artifact_open_total: null,
        findings_blocking_open_total: null,
        findings_advisory_open_total: null,
        findings_artifact_status:
          resolveFindingsArtifactStatus(input.reportJson) ?? null,
        findings_digest_sha256:
          resolveFindingsDigestSha256(input.reportJson) ?? null,
        meta_review_run_id: resolveMetaReviewRunId(input.reportJson) ?? null,
        findings_parity_status: "guard_failed"
      }
    };
  }

  const split = splitResolution.value;
  const summaryMismatch = resolveApproveSummaryStructuredMismatch({
    summary: input.runResult.summary,
    split
  });
  const artifactOpenTotalFieldRaw = input.reportJson.findings_artifact_open_total;
  const artifactOpenTotalResolved = resolveNonNegativeIntegerField(
    input.reportJson,
    "findings_artifact_open_total"
  );
  // On approve advisory-only path findings_artifact_open_total is optional.
  // `null` is treated as equivalent to "not provided" to keep legacy-canonical
  // payloads fail-open for this optional field.
  const artifactOpenTotal =
    artifactOpenTotalResolved === null && artifactOpenTotalFieldRaw === null
      ? undefined
      : artifactOpenTotalResolved;
  const metadata = buildApproveParityMetadata({
    reportJson: input.reportJson,
    split,
    artifactOpenTotal
  });

  if (summaryMismatch !== null) {
    return {
      ok: false,
      reason: summaryMismatch,
      metadata: {
        ...metadata,
        findings_parity_status: "guard_failed"
      }
    };
  }

  if (split.blocking > 0) {
    return {
      ok: false,
      reason:
        `${metaReviewApproveBlockingFindingsPresentReasonCode}: recommendation=approve requires findings_blocking_open_total=0 (found ${split.blocking}).`,
      metadata: {
        ...metadata,
        findings_parity_status: "guard_failed"
      }
    };
  }

  if (
    (input.claimState === "clean" && split.claimed > 0) ||
    (input.claimState === "open_findings" && split.claimed === 0)
  ) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_claim_state=${input.claimState} contradicts findings_claimed_open_total=${split.claimed}.`,
      metadata: {
        ...metadata,
        findings_parity_status: "guard_failed"
      }
    };
  }

  if (split.claimed !== split.blocking + split.advisory) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_claimed_open_total (${split.claimed}) must equal findings_blocking_open_total + findings_advisory_open_total (${split.blocking + split.advisory}).`,
      metadata: {
        ...metadata,
        findings_parity_status: "guard_failed"
      }
    };
  }

  if (artifactOpenTotal === null) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_open_total must be a non-negative integer when provided.`,
      metadata: {
        ...metadata,
        findings_parity_status: "guard_failed"
      }
    };
  }

  if (artifactOpenTotal !== undefined && artifactOpenTotal !== split.claimed) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_open_total (${artifactOpenTotal}) must equal findings_claimed_open_total (${split.claimed}).`,
      metadata: {
        ...metadata,
        findings_parity_status: "guard_failed"
      }
    };
  }

  return {
    ok: true,
    diagnostics: split.advisory > 0
      ? [
          `${metaReviewApproveAdvisoryOnlyReasonCode}: recommendation=approve accepted with advisory-only open findings (claimed=${split.claimed}; blocking=${split.blocking}; advisory=${split.advisory}).`
        ]
      : [],
    metadata
  };
}

function validateStructuredMetaReviewClaimPreflight(input: {
  recommendation: MetaReviewRecommendation;
  reportJson?: Record<string, unknown>;
}): StructuredClaimValidationPreflight {
  if (input.reportJson === undefined) {
    if (input.recommendation === "approve") {
      return {
        kind: "fail",
        reason:
          `${metaReviewApproveAdvisorySplitRequiredReasonCode}: recommendation=approve requires structured report_json split fields.`
      };
    }
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
  if (input.recommendation === "approve") {
    if (claimResolution.claim === undefined) {
      return {
        kind: "fail",
        reason:
          `${claimStateRequiredReasonCode}: recommendation=approve requires report_json findings_claim_state/findings_claim_source.`
      };
    }
    if (claimResolution.claim.state === "unknown") {
      return {
        kind: "fail",
        reason:
          `${claimStateRequiredReasonCode}: recommendation=approve cannot use findings_claim_state=unknown.`
      };
    }
    return {
      kind: "approve",
      reportJson: input.reportJson,
      claimState: claimResolution.claim.state
    };
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
  if (preflight.kind === "approve") {
    const approveValidation = validateApproveStructuredMetaReviewClaim({
      runResult: input.runResult,
      reportJson: preflight.reportJson,
      claimState: preflight.claimState
    });
    if (!approveValidation.ok) {
      return failStructuredMetaReviewPositiveClaim(
        approveValidation.reason,
        approveValidation.metadata
      );
    }
    return {
      ok: true,
      diagnostics: approveValidation.diagnostics,
      metadata: approveValidation.metadata
    };
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
