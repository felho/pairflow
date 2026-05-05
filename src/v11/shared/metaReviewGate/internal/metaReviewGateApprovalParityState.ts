import type { MetaReviewRecommendation } from "../../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";

export interface ApprovalAdvisoryFinding {
  severity: "P2" | "P3";
  title: string;
  refs?: string[];
}

function normalizeParityNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeParityStatus(
  value: FindingsParityMetadata["findings_parity_status"] | undefined
): "ok" | "mismatch" | "guard_failed" | null {
  return value === "ok" || value === "mismatch" || value === "guard_failed"
    ? value
    : null;
}

function hasPositiveParitySignals(input: {
  claimed: number | null;
  artifact: number | null;
  blockingOpenTotal: number | null;
  advisoryOpenTotal: number | null;
}): boolean {
  return (
    (input.claimed !== null && input.claimed > 0) ||
    (input.artifact !== null && input.artifact > 0) ||
    (input.blockingOpenTotal !== null && input.blockingOpenTotal > 0) ||
    (input.advisoryOpenTotal !== null && input.advisoryOpenTotal > 0)
  );
}

function hasCleanParityProof(input: {
  parityProofAvailable: boolean;
  claimed: number | null;
  artifact: number | null;
}): boolean {
  return input.parityProofAvailable && input.claimed === 0 && input.artifact === 0;
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
  const claimed = normalizeParityNumber(
    parityMetadata?.findings_claimed_open_total
  );
  const artifact = normalizeParityNumber(
    parityMetadata?.findings_artifact_open_total
  );
  const status = normalizeParityStatus(parityMetadata?.findings_parity_status);
  const blockingOpenTotal = normalizeParityNumber(
    parityMetadata?.findings_blocking_open_total
  );
  const advisoryOpenTotal = normalizeParityNumber(
    parityMetadata?.findings_advisory_open_total
  );
  const parityProofAvailable = claimed !== null && artifact !== null && status !== null;
  const advisorySplitAvailable =
    blockingOpenTotal !== null && advisoryOpenTotal !== null;

  if (
    hasPositiveParitySignals({
      claimed,
      artifact,
      blockingOpenTotal,
      advisoryOpenTotal
    })
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
  if (
    hasCleanParityProof({
      parityProofAvailable,
      claimed,
      artifact
    })
  ) {
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
