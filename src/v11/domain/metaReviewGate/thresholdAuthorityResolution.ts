import type { FindingPriority } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";

export const REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED =
  "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED" as const;
export const REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE =
  "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE" as const;

export type MetaReviewGateThresholdAuthorityResolution =
  | {
      status: "resolved";
      parityMetadata: FindingsParityMetadata | null;
      diagnostics: string[];
      highestOpenSeverity: FindingPriority;
      artifactRef: string;
      metaReviewRunId: string;
      findingsBlockingOpenTotal: number | null;
      findingsAdvisoryOpenTotal: number | null;
    }
  | {
      status: "unresolved" | "incomplete";
      parityMetadata: FindingsParityMetadata | null;
      diagnostics: string[];
      highestOpenSeverity: null;
      artifactRef: string | null;
      metaReviewRunId: string | null;
      findingsBlockingOpenTotal: number | null;
      findingsAdvisoryOpenTotal: number | null;
    };

export function prefixThresholdAuthorityDiagnostic(
  reasonCode: string,
  detail: string
): string {
  return `${reasonCode}: ${detail}`;
}

export function buildThresholdAuthorityUnresolved(input: {
  parityMetadata: FindingsParityMetadata | null;
  diagnostics: string[];
  artifactRef: string | null;
  metaReviewRunId: string | null;
  findingsBlockingOpenTotal: number | null;
  findingsAdvisoryOpenTotal: number | null;
}): MetaReviewGateThresholdAuthorityResolution {
  return {
    status: "unresolved",
    parityMetadata: input.parityMetadata,
    diagnostics: input.diagnostics,
    highestOpenSeverity: null,
    artifactRef: input.artifactRef,
    metaReviewRunId: input.metaReviewRunId,
    findingsBlockingOpenTotal: input.findingsBlockingOpenTotal,
    findingsAdvisoryOpenTotal: input.findingsAdvisoryOpenTotal
  };
}

export function buildThresholdAuthorityIncomplete(input: {
  parityMetadata: FindingsParityMetadata | null;
  artifactRef: string | null;
  metaReviewRunId: string;
  findingsBlockingOpenTotal: number | null;
  findingsAdvisoryOpenTotal: number | null;
}): MetaReviewGateThresholdAuthorityResolution {
  return {
    status: "incomplete",
    parityMetadata: input.parityMetadata,
    diagnostics: [
      prefixThresholdAuthorityDiagnostic(
        REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE,
        "findings artifact does not expose a resolvable open severity."
      )
    ],
    highestOpenSeverity: null,
    artifactRef: input.artifactRef,
    metaReviewRunId: input.metaReviewRunId,
    findingsBlockingOpenTotal: input.findingsBlockingOpenTotal,
    findingsAdvisoryOpenTotal: input.findingsAdvisoryOpenTotal
  };
}
