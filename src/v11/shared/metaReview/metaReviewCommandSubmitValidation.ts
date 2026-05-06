import { isNonEmptyString } from "../validation/primitives.js";
import { MetaReviewError } from "./metaReviewError.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type { BubbleReviewAutoReworkSeverity } from "../../../types/bubble.js";
import {
  type MetaReviewGateThresholdAuthorityResolution,
  metaReviewGateThresholdIsMet
} from "../../domain/metaReviewGate/index.js";

export type SubmitRunStatus = "success";

export const metaReviewApproveThresholdBlockedReasonCode =
  "META_REVIEW_APPROVE_THRESHOLD_BLOCKED" as const;
export const metaReviewApproveThresholdContextUnresolvedReasonCode =
  "META_REVIEW_APPROVE_THRESHOLD_CONTEXT_UNRESOLVED" as const;

export function resolveSubmitRunStatus(): SubmitRunStatus {
  return "success";
}

export function assertSubmitStatusIsSuccess(
  status: MetaReviewRunStatus
): asserts status is SubmitRunStatus {
  if (status !== "success") {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID_COMBINATION",
      message:
        "meta-review submit only accepts status=success; recommendation carries the routed outcome semantics",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "submit_status_must_be_success"
      }
    });
  }
}

export function assertSubmitPayloadInvariants(input: {
  recommendation: MetaReviewRecommendation;
  reworkTargetMessage: string | null;
}): void {
  if (
    input.recommendation === "rework" &&
    !isNonEmptyString(input.reworkTargetMessage)
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID",
      message:
        "meta-review run requires a non-empty rework target message when recommendation is rework",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "rework_target_message_missing_for_rework"
      }
    });
  }
  if (
    input.recommendation !== "rework" &&
    input.reworkTargetMessage !== null &&
    !isNonEmptyString(input.reworkTargetMessage)
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID",
      message:
        "meta-review run advisory rework target message must be non-empty when provided",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "advisory_rework_target_message_invalid"
      }
    });
  }
}

export function normalizeRequiredSubmitText(
  value: string,
  fieldName: "summary"
): string {
  if (!isNonEmptyString(value)) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message: `meta-review submit ${fieldName} must be a non-empty string`,
      context: {
        source: "meta_review_command_submit_validation",
        reason: `${fieldName}_must_be_non_empty`
      }
    });
  }
  return value.trim();
}

function resolveNumericReportField(
  reportJson: Record<string, unknown>,
  fieldName: string
): number | null {
  const value = reportJson[fieldName];
  return Number.isInteger(value) && typeof value === "number" ? value : null;
}

export function metaReviewApproveClaimsOpenFindings(
  reportJson: Record<string, unknown>
): boolean {
  const claimState = reportJson.findings_claim_state;
  if (claimState === "open_findings") {
    return true;
  }

  const claimedOpenTotal = resolveNumericReportField(
    reportJson,
    "findings_claimed_open_total"
  );
  if (claimedOpenTotal !== null) {
    return claimedOpenTotal > 0;
  }

  const blockingOpenTotal = resolveNumericReportField(
    reportJson,
    "findings_blocking_open_total"
  );
  const advisoryOpenTotal = resolveNumericReportField(
    reportJson,
    "findings_advisory_open_total"
  );
  return (blockingOpenTotal ?? 0) + (advisoryOpenTotal ?? 0) > 0;
}

export function assertApproveThresholdPolicy(input: {
  recommendation: MetaReviewRecommendation;
  reportJson: Record<string, unknown>;
  minSeverity: BubbleReviewAutoReworkSeverity;
  thresholdAuthority: MetaReviewGateThresholdAuthorityResolution | null;
  bubbleId: string;
  round: number;
}): void {
  if (
    input.recommendation !== "approve" ||
    !metaReviewApproveClaimsOpenFindings(input.reportJson)
  ) {
    return;
  }

  const thresholdAuthority = input.thresholdAuthority;
  if (thresholdAuthority?.status !== "resolved") {
    throw new MetaReviewError({
      reasonCode: metaReviewApproveThresholdContextUnresolvedReasonCode,
      message:
        "meta-review approve rejected: open-findings approve requires resolved same-run threshold authority.",
      context: {
        source: "meta_review_command_submit_validation",
        bubbleId: input.bubbleId,
        round: input.round,
        reason: "approve_open_findings_threshold_authority_unresolved",
        configuredMinSeverity: input.minSeverity,
        thresholdStatus: thresholdAuthority?.status ?? "missing"
      }
    });
  }

  if (
    metaReviewGateThresholdIsMet({
      highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
      minSeverity: input.minSeverity
    })
  ) {
    throw new MetaReviewError({
      reasonCode: metaReviewApproveThresholdBlockedReasonCode,
      message:
        "meta-review approve rejected: highest same-run open severity meets the configured premature-approval guard threshold; emit rework instead.",
      context: {
        source: "meta_review_command_submit_validation",
        bubbleId: input.bubbleId,
        round: input.round,
        reason: "approve_open_findings_threshold_met",
        configuredMinSeverity: input.minSeverity,
        highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
        artifactRef: thresholdAuthority.artifactRef,
        metaReviewRunId: thresholdAuthority.metaReviewRunId
      }
    });
  }
}
