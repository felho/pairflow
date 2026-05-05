import type { MetaReviewRecommendation } from "../../../../types/bubble.js";
import {
  hasApproveFindingsSplitMetadata,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";
import {
  type ApprovalAdvisoryFinding,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot
} from "./metaReviewGateApprovalParityState.js";
export {
  type ApprovalAdvisoryFinding,
  hasConsistentApproveAdvisoryOnlySplit,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot
} from "./metaReviewGateApprovalParityState.js";

const convergedAdvisoryMetadataRequiredReasonCode =
  "CONVERGED_ADVISORY_METADATA_REQUIRED";
const metaReviewFindingsParityGuardReasonCode = "META_REVIEW_FINDINGS_PARITY_GUARD";
const metaReviewApproveBlockingFindingsPresentReasonCode =
  "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT";

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
        `${convergedAdvisoryMetadataRequiredReasonCode}: context advisory_findings payload must include non-empty title and severity=P2|P3.`
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
        `${convergedAdvisoryMetadataRequiredReasonCode}: context route=${input.route}; recommendation=approve requires findings_claimed_open_total, findings_blocking_open_total, and findings_advisory_open_total.`
      );
    }
    const claimed = input.parityMetadata.findings_claimed_open_total;
    const blocking = input.parityMetadata.findings_blocking_open_total;
    const advisory = input.parityMetadata.findings_advisory_open_total;
    if (blocking > 0) {
      throw new Error(
        `${metaReviewApproveBlockingFindingsPresentReasonCode}: context route=${input.route}; recommendation=approve requires findings_blocking_open_total=0 (found ${blocking}).`
      );
    }
    if (claimed !== blocking + advisory) {
      throw new Error(
        `${metaReviewFindingsParityGuardReasonCode}: context route=${input.route}; findings_claimed_open_total (${claimed}) must equal findings_blocking_open_total + findings_advisory_open_total (${blocking + advisory}).`
      );
    }
    const artifact = input.parityMetadata.findings_artifact_open_total;
    if (typeof artifact === "number" && artifact !== claimed) {
      throw new Error(
        `${metaReviewFindingsParityGuardReasonCode}: context route=${input.route}; findings_artifact_open_total (${artifact}) must equal findings_claimed_open_total (${claimed}).`
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
      `${convergedAdvisoryMetadataRequiredReasonCode}: context route=${input.route}; findings_blocking_open_total and findings_advisory_open_total are required on advisory_v1 approval routing path.`
    );
  }
}
