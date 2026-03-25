import type { readFile } from "node:fs/promises";

import {
  resolveLegacySummaryFindingsClaimState
} from "../../../core/convergence/policy.js";
import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import { type FindingsParityMetadata } from "../../../types/protocol.js";
import { resolveStructuredMetaReviewClaimFromReportJson } from "./metaReviewGateFindingsMetadata.js";
import {
  metaReviewApproveAdvisorySplitRequiredReasonCode,
  validateApproveStructuredMetaReviewClaim
} from "./metaReviewGateApproveClaimValidation.js";
import {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  resolveReworkFindingsParityInput,
  validateFindingsArtifactParity
} from "./metaReviewGateFindingsParityHelpers.js";

export {
  metaReviewSummaryStructuredMismatchReasonCode,
  metaReviewApproveBlockingFindingsPresentReasonCode,
  metaReviewApproveAdvisoryOnlyReasonCode,
  metaReviewApproveAdvisorySplitRequiredReasonCode,
  metaReviewApproveAdvisorySplitFormatInvalidReasonCode
} from "./metaReviewGateApproveClaimValidation.js";

type StructuredClaimValidationPreflight =
  | { kind: "pass" }
  | { kind: "fail"; reason: string }
  | { kind: "rework"; reportJson: Record<string, unknown> }
  | {
      kind: "approve";
      reportJson: Record<string, unknown>;
      claimState: "clean" | "open_findings";
    };

function failStructuredMetaReviewPositiveClaim(
  reason: string,
  metadata: FindingsParityMetadata | null = null
): { ok: false; reason: string; metadata: FindingsParityMetadata | null } {
  return { ok: false, reason, metadata };
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
