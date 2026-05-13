import type {
  BubbleReviewAutoReworkSeverity
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  MetaReviewRecommendation
} from "../../shared/metaReview/metaReviewTypes.js";
import type { FindingPriority } from "../../../contracts/kernel/findings.js";
import type {
  MetaReviewGateThresholdAuthorityResolution
} from "./thresholdAuthorityResolution.js";
import { metaReviewGateThresholdIsMet } from "./thresholdAuthority.js";

export const metaReviewApproveThresholdBlockedReasonCode =
  "META_REVIEW_APPROVE_THRESHOLD_BLOCKED" as const;
export const metaReviewApproveThresholdContextUnresolvedReasonCode =
  "META_REVIEW_APPROVE_THRESHOLD_CONTEXT_UNRESOLVED" as const;

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

export type MetaReviewSubmitApproveThresholdPolicyResolution =
  | {
      accepted: true;
    }
  | {
      accepted: false;
      reasonCode:
        | typeof metaReviewApproveThresholdBlockedReasonCode
        | typeof metaReviewApproveThresholdContextUnresolvedReasonCode;
      reason:
        | "approve_open_findings_threshold_authority_unresolved"
        | "approve_open_findings_threshold_met";
      thresholdStatus?: MetaReviewGateThresholdAuthorityResolution["status"] | "missing";
      highestOpenSeverity?: FindingPriority;
      artifactRef?: string;
      metaReviewRunId?: string;
    };

export function resolveMetaReviewSubmitApproveThresholdPolicy(input: {
  recommendation: MetaReviewRecommendation;
  reportJson: Record<string, unknown>;
  minSeverity: BubbleReviewAutoReworkSeverity;
  thresholdAuthority: MetaReviewGateThresholdAuthorityResolution | null;
}): MetaReviewSubmitApproveThresholdPolicyResolution {
  if (
    input.recommendation !== "approve" ||
    !metaReviewApproveClaimsOpenFindings(input.reportJson)
  ) {
    return { accepted: true };
  }

  const thresholdAuthority = input.thresholdAuthority;
  if (thresholdAuthority?.status !== "resolved") {
    return {
      accepted: false,
      reasonCode: metaReviewApproveThresholdContextUnresolvedReasonCode,
      reason: "approve_open_findings_threshold_authority_unresolved",
      thresholdStatus: thresholdAuthority?.status ?? "missing"
    };
  }

  if (
    metaReviewGateThresholdIsMet({
      highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
      minSeverity: input.minSeverity
    })
  ) {
    return {
      accepted: false,
      reasonCode: metaReviewApproveThresholdBlockedReasonCode,
      reason: "approve_open_findings_threshold_met",
      highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
      artifactRef: thresholdAuthority.artifactRef,
      metaReviewRunId: thresholdAuthority.metaReviewRunId
    };
  }

  return { accepted: true };
}
