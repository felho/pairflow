import {
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode
} from "../convergence/policy.js";
import {
  isFindingsClaimSource,
  isFindingsClaimState
} from "../../../contracts/kernel/protocol.js";

export function resolveFindingsCountFromMetaReviewReportJson(
  reportJson: Record<string, unknown>
): number | undefined {
  const explicitCount = reportJson.findings_count;
  if (
    typeof explicitCount === "number" &&
    Number.isInteger(explicitCount) &&
    explicitCount >= 0
  ) {
    return explicitCount;
  }
  return undefined;
}

export function resolveNonNegativeIntegerField(
  reportJson: Record<string, unknown>,
  field: string
): number | null | undefined {
  const raw = reportJson[field];
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) {
    return raw;
  }
  return null;
}

export function resolveStructuredMetaReviewClaimFromReportJson(input: {
  reportJson: Record<string, unknown>;
}):
  | {
      claim: {
        state: "clean" | "open_findings" | "unknown";
        source: "meta_review_artifact";
      };
    }
  | { claim: undefined }
  | { reason: string } {
  const claimStateRaw = input.reportJson.findings_claim_state;
  const claimSourceRaw = input.reportJson.findings_claim_source;
  const hasClaimState = claimStateRaw !== undefined;
  const hasClaimSource = claimSourceRaw !== undefined;

  if (hasClaimState !== hasClaimSource) {
    if (!hasClaimState) {
      return {
        reason:
          `${claimStateRequiredReasonCode}: meta-review report_json.findings_claim_state is required when findings_claim_source is provided.`
      };
    }
    return {
      reason:
        `${claimSourceInvalidReasonCode}: meta-review report_json.findings_claim_source is required when findings_claim_state is provided.`
    };
  }
  if (!hasClaimState) {
    return { claim: undefined };
  }
  if (!isFindingsClaimState(claimStateRaw)) {
    return {
      reason:
        `${claimStateRequiredReasonCode}: meta-review report_json.findings_claim_state must be clean|open_findings|unknown.`
    };
  }
  if (!isFindingsClaimSource(claimSourceRaw)) {
    return {
      reason:
        `${claimSourceInvalidReasonCode}: meta-review report_json.findings_claim_source must be payload_flags|payload_findings_count|legacy_summary_parser|meta_review_artifact.`
    };
  }
  if (claimSourceRaw !== "meta_review_artifact") {
    return {
      reason:
        `${claimSourceInvalidReasonCode}: meta-review structured claim source must be meta_review_artifact (found ${claimSourceRaw}).`
    };
  }

  return {
    claim: {
      state: claimStateRaw,
      source: "meta_review_artifact"
    }
  };
}
