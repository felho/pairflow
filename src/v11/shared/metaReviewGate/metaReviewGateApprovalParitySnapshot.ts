import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  type FindingsParityMetadata
} from "../../../types/protocol.js";

const convergedAdvisoryMetadataRequiredReasonCode =
  "CONVERGED_ADVISORY_METADATA_REQUIRED";
const metaReviewFindingsParityGuardReasonCode = "META_REVIEW_FINDINGS_PARITY_GUARD";
const metaReviewApproveBlockingFindingsPresentReasonCode =
  "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT";

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

export function normalizeApprovalAdvisoryFindings(
  findings: ApprovalAdvisoryFinding[] | undefined
): ApprovalAdvisoryFinding[] | undefined {
  if (findings === undefined) {
    return undefined;
  }
  const normalized: ApprovalAdvisoryFinding[] = [];
  for (const finding of findings) {
    const severity = finding.severity;
    const title = typeof finding.title === "string" ? finding.title.trim() : "";
    if ((severity !== "P2" && severity !== "P3") || title.length === 0) {
      throw new Error(
        `${convergedAdvisoryMetadataRequiredReasonCode}: advisory findings payload must include non-empty title and severity=P2|P3.`
      );
    }
    const refs = Array.isArray(finding.refs)
      ? finding.refs
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      : undefined;
    normalized.push({
      severity,
      title,
      ...(refs !== undefined && refs.length > 0
        ? { refs }
        : {})
    });
  }
  return normalized;
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

export function assertAdvisorySplitMetadataWhenRequired(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
}): void {
  if (input.route !== "human_gate_approve") {
    return;
  }

  if (
    input.recommendation === "approve"
  ) {
    if (!hasApproveFindingsSplitMetadata(input.parityMetadata)) {
      throw new Error(
        `${convergedAdvisoryMetadataRequiredReasonCode}: recommendation=approve requires findings_claimed_open_total, findings_blocking_open_total, and findings_advisory_open_total.`
      );
    }
    const claimed = input.parityMetadata.findings_claimed_open_total;
    const blocking = input.parityMetadata.findings_blocking_open_total;
    const advisory = input.parityMetadata.findings_advisory_open_total;
    if (blocking > 0) {
      throw new Error(
        `${metaReviewApproveBlockingFindingsPresentReasonCode}: recommendation=approve requires findings_blocking_open_total=0 (found ${blocking}).`
      );
    }
    if (claimed !== blocking + advisory) {
      throw new Error(
        `${metaReviewFindingsParityGuardReasonCode}: findings_claimed_open_total (${claimed}) must equal findings_blocking_open_total + findings_advisory_open_total (${blocking + advisory}).`
      );
    }
    const artifact = input.parityMetadata.findings_artifact_open_total;
    if (typeof artifact === "number" && artifact !== claimed) {
      throw new Error(
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_open_total (${artifact}) must equal findings_claimed_open_total (${claimed}).`
      );
    }
  }

  const parity = resolveStructuredParityMetadataSnapshot(input.parityMetadata);
  const advisoryContractInvariant = resolveAdvisoryContractInvariant({
    parity,
    advisoryFindings: input.advisoryFindings
  });
  if (advisoryContractInvariant.advisorySplitRequiredButMissing) {
    throw new Error(
      `${convergedAdvisoryMetadataRequiredReasonCode}: findings_blocking_open_total and findings_advisory_open_total are required on advisory_v1 approval routing path.`
    );
  }
}
