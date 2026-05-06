import type { FindingPriority } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { metaReviewGateThresholdIsMet } from "./thresholdAuthority.js";

export type CleanApprovalThresholdAuthority =
  | {
      status: "resolved";
      highestOpenSeverity: FindingPriority;
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      status: "unresolved" | "incomplete";
      parityMetadata: FindingsParityMetadata | null;
    };

export type ResolveThresholdCleanApprovalPolicyInput = {
  recommendation: "approve" | "rework" | "inconclusive";
  parityMetadata: FindingsParityMetadata | null;
  configuredMinSeverity: FindingPriority;
  thresholdAuthority?: CleanApprovalThresholdAuthority;
};

export type ThresholdCleanApprovalPolicyResolution =
  | { clean: true; parityMetadata: FindingsParityMetadata | null }
  | {
      clean: false;
      thresholdRequired: true;
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      clean: false;
      thresholdRequired: false;
      parityMetadata: FindingsParityMetadata | null;
      fallbackReason: string;
    };

export function resolveThresholdCleanApprovalPolicy(
  input: ResolveThresholdCleanApprovalPolicyInput
): ThresholdCleanApprovalPolicyResolution {
  if (input.recommendation !== "approve") {
    return {
      clean: false,
      thresholdRequired: false,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RUN_NOT_APPROVE: recommendation is not approve."
    };
  }

  if (
    input.parityMetadata?.findings_claimed_open_total === 0 &&
    input.parityMetadata.findings_blocking_open_total === 0 &&
    input.parityMetadata.findings_advisory_open_total === 0 &&
    input.parityMetadata.findings_parity_status !== "guard_failed"
  ) {
    return { clean: true, parityMetadata: input.parityMetadata };
  }

  if (input.thresholdAuthority === undefined) {
    return {
      clean: false,
      thresholdRequired: true,
      parityMetadata: input.parityMetadata
    };
  }

  const parityMetadata =
    input.thresholdAuthority.parityMetadata ?? input.parityMetadata;

  if (input.thresholdAuthority.status !== "resolved") {
    return {
      clean: false,
      thresholdRequired: false,
      parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_UNRESOLVED: thresholdStatus=${input.thresholdAuthority.status}.`
    };
  }

  if (
    metaReviewGateThresholdIsMet({
      highestOpenSeverity: input.thresholdAuthority.highestOpenSeverity,
      minSeverity: input.configuredMinSeverity
    })
  ) {
    return {
      clean: false,
      thresholdRequired: false,
      parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RUN_THRESHOLD_MET: highestOpenSeverity=${input.thresholdAuthority.highestOpenSeverity}; configuredMinSeverity=${input.configuredMinSeverity}.`
    };
  }

  return { clean: true, parityMetadata };
}
