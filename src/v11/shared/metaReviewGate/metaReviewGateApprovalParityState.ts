import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  type FindingsParityMetadata
} from "../../../types/protocol.js";

export interface ApprovalAdvisoryFinding {
  severity: "P2" | "P3";
  title: string;
  refs?: string[];
}

export function resolveStructuredParityMetadataSnapshot(
  parityMetadata: FindingsParityMetadata | null | undefined
): {
  structuredClaim: "clean" | "open_findings" | "unknown";
  parityProofAvailable: boolean;
  advisorySplitAvailable: boolean;
  claimed: number | null;
  artifact: number | null;
  blockingOpenTotal: number | null;
  advisoryOpenTotal: number | null;
  status: "ok" | "mismatch" | "guard_failed" | null;
} {
  const claimed =
    typeof parityMetadata?.findings_claimed_open_total === "number"
      ? parityMetadata.findings_claimed_open_total
      : null;
  const artifact =
    typeof parityMetadata?.findings_artifact_open_total === "number"
      ? parityMetadata.findings_artifact_open_total
      : null;
  const status =
    parityMetadata?.findings_parity_status === "ok" ||
    parityMetadata?.findings_parity_status === "mismatch" ||
    parityMetadata?.findings_parity_status === "guard_failed"
      ? parityMetadata.findings_parity_status
      : null;
  const blockingOpenTotal =
    typeof parityMetadata?.findings_blocking_open_total === "number"
      ? parityMetadata.findings_blocking_open_total
      : null;
  const advisoryOpenTotal =
    typeof parityMetadata?.findings_advisory_open_total === "number"
      ? parityMetadata.findings_advisory_open_total
      : null;
  const parityProofAvailable = claimed !== null && artifact !== null && status !== null;
  const advisorySplitAvailable =
    blockingOpenTotal !== null && advisoryOpenTotal !== null;

  if (
    (claimed !== null && claimed > 0) ||
    (artifact !== null && artifact > 0) ||
    (blockingOpenTotal !== null && blockingOpenTotal > 0) ||
    (advisoryOpenTotal !== null && advisoryOpenTotal > 0)
  ) {
    return {
      structuredClaim: "open_findings",
      parityProofAvailable,
      advisorySplitAvailable,
      claimed,
      artifact,
      blockingOpenTotal,
      advisoryOpenTotal,
      status
    };
  }
  if (parityProofAvailable && claimed === 0 && artifact === 0) {
    return {
      structuredClaim: "clean",
      parityProofAvailable,
      advisorySplitAvailable,
      claimed,
      artifact,
      blockingOpenTotal,
      advisoryOpenTotal,
      status
    };
  }
  return {
    structuredClaim: "unknown",
    parityProofAvailable,
    advisorySplitAvailable,
    claimed,
    artifact,
    blockingOpenTotal,
    advisoryOpenTotal,
    status
  };
}

export function hasConsistentApproveAdvisoryOnlySplit(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  parityMetadata: FindingsParityMetadata | null | undefined;
}): boolean {
  if (input.route !== "human_gate_approve" || input.recommendation !== "approve") {
    return false;
  }
  if (!hasApproveFindingsSplitMetadata(input.parityMetadata)) {
    return false;
  }
  const claimed = input.parityMetadata.findings_claimed_open_total;
  const blocking = input.parityMetadata.findings_blocking_open_total;
  const advisory = input.parityMetadata.findings_advisory_open_total;
  return claimed > 0 && blocking === 0 && advisory === claimed;
}

export function resolveAdvisoryContractInvariant(input: {
  parity: ReturnType<typeof resolveStructuredParityMetadataSnapshot>;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
}): {
  advisoryCountListMismatch: boolean;
  advisoryFindingsOpenTotal: number | null;
  advisoryFindingsListCount: number;
  advisorySplitRequiredButMissing: boolean;
} {
  const advisoryFindingsListCount = input.advisoryFindings?.length ?? 0;
  const advisoryCount = input.parity.advisoryOpenTotal;
  const hasAdvisoryList = input.advisoryFindings !== undefined;
  const hasAdvisorySignal =
    (advisoryCount ?? 0) > 0
    || ((input.advisoryFindings?.length ?? 0) > 0);
  const advisoryCountListMismatch =
    hasAdvisoryList &&
    advisoryCount !== null &&
    advisoryCount !== advisoryFindingsListCount;
  return {
    advisoryCountListMismatch,
    advisoryFindingsOpenTotal: advisoryCount,
    advisoryFindingsListCount,
    advisorySplitRequiredButMissing:
      hasAdvisorySignal && !input.parity.advisorySplitAvailable
  };
}
