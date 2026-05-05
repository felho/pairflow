import type { MetaReviewRecommendation } from "../../../../types/bubble.js";
import { resolveStructuredMetaReviewClaimFromReportJson } from "../metaReviewGateFindingsMetadata.js";
import {
  metaReviewApproveAdvisorySplitRequiredReasonCode
} from "./metaReviewGateApproveClaimSplit.js";
import {
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode
} from "../metaReviewGateFindingsParityHelpers.js";

export type StructuredClaimValidationPreflight =
  | { kind: "pass" }
  | { kind: "fail"; reason: string }
  | { kind: "rework"; reportJson: Record<string, unknown> }
  | {
      kind: "approve";
      reportJson: Record<string, unknown>;
      claimState: "clean" | "open_findings";
    };

export function validateStructuredMetaReviewClaimPreflight(input: {
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
