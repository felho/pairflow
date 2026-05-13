import type { FindingPriority } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../shared/metaReviewGate/findingsParityMetadataContract.js";
import { metaReviewGateThresholdIsMet } from "./thresholdAuthority.js";

export const META_REVIEW_APPROVE_THRESHOLD_BACKSTOP =
  "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP" as const;

export type ApproveThresholdBackstopAuthority =
  | {
      status: "resolved";
      highestOpenSeverity: FindingPriority;
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      status: "unresolved" | "incomplete";
      parityMetadata: FindingsParityMetadata | null;
    };

export type ResolveApproveThresholdBackstopPolicyInput = {
  recommendation: "approve" | "rework" | "inconclusive";
  claimsOpenFindings: boolean;
  parityMetadata: FindingsParityMetadata | null;
  configuredMinSeverity: FindingPriority;
  thresholdAuthority?: ApproveThresholdBackstopAuthority;
};

export type ApproveThresholdBackstopPolicyResolution =
  | {
      blocked: false;
      thresholdRequired: false;
      parityMetadata: FindingsParityMetadata | null;
      thresholdAuthority?: ApproveThresholdBackstopAuthority;
    }
  | {
      blocked: false;
      thresholdRequired: true;
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      blocked: true;
      thresholdRequired: false;
      parityMetadata: FindingsParityMetadata | null;
      fallbackReason: string;
    };

export function resolveApproveThresholdBackstopPolicy(
  input: ResolveApproveThresholdBackstopPolicyInput
): ApproveThresholdBackstopPolicyResolution {
  if (input.recommendation !== "approve" || !input.claimsOpenFindings) {
    return {
      blocked: false,
      thresholdRequired: false,
      parityMetadata: input.parityMetadata
    };
  }

  if (input.thresholdAuthority === undefined) {
    return {
      blocked: false,
      thresholdRequired: true,
      parityMetadata: input.parityMetadata
    };
  }

  const parityMetadata =
    input.thresholdAuthority.parityMetadata ?? input.parityMetadata;

  if (
    input.thresholdAuthority.status !== "resolved" ||
    metaReviewGateThresholdIsMet({
      highestOpenSeverity: input.thresholdAuthority.highestOpenSeverity,
      minSeverity: input.configuredMinSeverity
    })
  ) {
    const authorityDetail =
      input.thresholdAuthority.status === "resolved"
        ? `highestOpenSeverity=${input.thresholdAuthority.highestOpenSeverity}; configuredMinSeverity=${input.configuredMinSeverity}`
        : `thresholdStatus=${input.thresholdAuthority.status}`;
    return {
      blocked: true,
      thresholdRequired: false,
      parityMetadata,
      fallbackReason:
        `${META_REVIEW_APPROVE_THRESHOLD_BACKSTOP}: invalid open-findings approve cannot route to human_gate_approve (${authorityDetail}).`
    };
  }

  return {
    blocked: false,
    thresholdRequired: false,
    parityMetadata,
    thresholdAuthority: input.thresholdAuthority
  };
}
