import type { MetaReviewRecommendation } from "../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  resolveFindingsParityMetadataForEnvelope,
  type FindingsParityMetadata
} from "../../types/protocol.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  evaluatePositiveSummaryFindingsAssertion
} from "../convergence/policy.js";
import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../protocol/transcriptStore.js";

const approvalSummaryMetadataMismatchReasonCode =
  "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH";
const convergedSummaryFindingsContradictionDefenseInDepthReasonCode =
  "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH";
const convergedAdvisoryCountListMismatchReasonCode =
  "CONVERGED_ADVISORY_COUNT_LIST_MISMATCH";
const convergedAdvisoryMetadataRequiredReasonCode =
  "CONVERGED_ADVISORY_METADATA_REQUIRED";
const approvalSummaryNormalizedReasonCode =
  "META_REVIEW_GATE_APPROVAL_SUMMARY_NORMALIZED";
const approvalSummaryConsistencyStatusMetadataKey =
  "approval_summary_consistency_status";
const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";

function resolveStructuredParityMetadataSnapshot(
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

  if ((claimed !== null && claimed > 0) || (artifact !== null && artifact > 0)) {
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

export interface ApprovalAdvisoryFinding {
  severity: "P2" | "P3";
  title: string;
  refs?: string[];
}

function normalizeApprovalAdvisoryFindings(
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
    const refs =
      Array.isArray(finding.refs) &&
      finding.refs.every((value) => typeof value === "string" && value.trim().length > 0)
        ? finding.refs
        : undefined;
    normalized.push({
      severity,
      title,
      ...(refs !== undefined
        ? { refs }
        : {})
    });
  }
  return normalized;
}

function resolveAdvisoryContractInvariant(input: {
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
  const hasAdvisorySignal =
    advisoryCount !== null
    || ((input.advisoryFindings?.length ?? 0) > 0);
  const advisoryCountListMismatch =
    advisoryCount !== null && advisoryCount !== advisoryFindingsListCount;
  return {
    advisoryCountListMismatch,
    advisoryFindingsOpenTotal: advisoryCount,
    advisoryFindingsListCount,
    advisorySplitRequiredButMissing:
      hasAdvisorySignal && !input.parity.advisorySplitAvailable
  };
}

function assertAdvisorySplitMetadataWhenRequired(input: {
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
}): void {
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

function resolveApprovalRequestSummaryConsistency(input: {
  summary: string;
  route: string;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
}): {
  summary: string;
  metadata: Record<string, unknown>;
} {
  void input.route;
  const parity = resolveStructuredParityMetadataSnapshot(input.parityMetadata);
  const advisoryContractInvariant = resolveAdvisoryContractInvariant({
    parity,
    advisoryFindings: input.advisoryFindings
  });
  if (advisoryContractInvariant.advisoryCountListMismatch) {
    return {
      summary:
        `${approvalSummaryNormalizedReasonCode}: advisory findings aggregate/list mismatch detected (reason=${convergedAdvisoryCountListMismatchReasonCode}; advisory_open_total=${advisoryContractInvariant.advisoryFindingsOpenTotal}; advisory_list_total=${advisoryContractInvariant.advisoryFindingsListCount}).`,
      metadata: {
        approval_summary_normalized: true,
        approval_summary_normalization_reason_code:
          convergedAdvisoryCountListMismatchReasonCode,
        approval_summary_normalization_original_summary: input.summary,
        [approvalSummaryConsistencyStatusMetadataKey]: "mismatch"
      }
    };
  }

  const noFindingsAssertion = evaluateNoFindingsSummaryFindingsAssertion(input.summary);
  const hasAdvisoryOpenFindings =
    (advisoryContractInvariant.advisoryFindingsOpenTotal ?? 0) > 0;
  if (noFindingsAssertion.hasNoFindingsAssertion && hasAdvisoryOpenFindings) {
    return {
      summary:
        `${approvalSummaryNormalizedReasonCode}: reviewer convergence narrative claim conflicts with advisory findings aggregate (reason=${convergedSummaryFindingsContradictionDefenseInDepthReasonCode}; advisory_open_total=${advisoryContractInvariant.advisoryFindingsOpenTotal}).`,
      metadata: {
        approval_summary_normalized: true,
        approval_summary_normalization_reason_code:
          convergedSummaryFindingsContradictionDefenseInDepthReasonCode,
        approval_summary_normalization_original_summary: input.summary,
        approval_summary_positive_clause_count: noFindingsAssertion.positiveClauseCount,
        approval_summary_evaluated_clause_count: noFindingsAssertion.evaluatedClauseCount,
        [approvalSummaryConsistencyStatusMetadataKey]: "mismatch"
      }
    };
  }

  const assertion = evaluatePositiveSummaryFindingsAssertion(input.summary);
  if (!assertion.hasPositiveAssertion) {
    return {
      summary: input.summary,
      metadata: {}
    };
  }

  if (parity.structuredClaim === "open_findings") {
    return {
      summary: input.summary,
      metadata: {}
    };
  }

  if (!parity.parityProofAvailable) {
    return {
      summary: input.summary,
      metadata: {}
    };
  }
  const hasParityInconsistency =
    parity.status !== "ok" || parity.claimed !== parity.artifact;
  if (!hasParityInconsistency) {
    return {
      summary: input.summary,
      metadata: {}
    };
  }

  const mismatchReasonCode = approvalSummaryMetadataMismatchReasonCode;
  const claimedText = parity.claimed === null ? "?" : String(parity.claimed);
  const artifactText = parity.artifact === null ? "?" : String(parity.artifact);
  const statusText = parity.status ?? "unknown";
  const normalizedSummaryReason =
    "reviewer convergence narrative claim conflicts with structured parity metadata.";

  return {
    summary: `${approvalSummaryNormalizedReasonCode}: ${normalizedSummaryReason} (reason=${mismatchReasonCode}; claimed=${claimedText}; artifact=${artifactText}; status=${statusText}).`,
    metadata: {
      approval_summary_normalized: true,
      approval_summary_normalization_reason_code: mismatchReasonCode,
      approval_summary_normalization_original_summary: input.summary,
      approval_summary_positive_clause_count: assertion.positiveClauseCount,
      approval_summary_evaluated_clause_count: assertion.evaluatedClauseCount,
      [approvalSummaryConsistencyStatusMetadataKey]: "mismatch"
    }
  };
}

function resolveGateRouteMetadata(route: string): Record<string, unknown> {
  if (route !== "human_gate_run_failed") {
    return {
      meta_review_gate_route: route
    };
  }
  return {
    meta_review_gate_route: route,
    meta_review_gate_reason_code: metaReviewGateRunFailedReasonCode,
    meta_review_gate_run_failed: true
  };
}

export async function appendHumanApprovalRequestEnvelope(input: {
  appendEnvelope?: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  summary: string;
  route: string;
  refs: string[];
  recommendation?: MetaReviewRecommendation;
  parityMetadata?: FindingsParityMetadata | null | undefined;
  findings?: ApprovalAdvisoryFinding[];
}): Promise<AppendProtocolEnvelopeResult> {
  const appendEnvelope = input.appendEnvelope ?? appendProtocolEnvelope;
  const advisoryFindings = normalizeApprovalAdvisoryFindings(input.findings);
  assertAdvisorySplitMetadataWhenRequired({
    parityMetadata: input.parityMetadata,
    advisoryFindings
  });
  const summaryConsistency = resolveApprovalRequestSummaryConsistency({
    summary: input.summary,
    route: input.route,
    parityMetadata: input.parityMetadata,
    advisoryFindings
  });
  return appendEnvelope({
    transcriptPath: input.transcriptPath,
    mirrorPaths: [input.inboxPath],
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "APPROVAL_REQUEST",
      round: input.round,
      payload: {
        summary: summaryConsistency.summary,
        ...(advisoryFindings !== undefined && advisoryFindings.length > 0
          ? { findings: advisoryFindings }
          : {}),
        metadata: {
          [deliveryTargetRoleMetadataKey]: "status",
          actor: "meta-reviewer",
          actor_agent: "codex",
          ...(input.recommendation !== undefined
            ? { latest_recommendation: input.recommendation }
            : {}),
          ...resolveGateRouteMetadata(input.route),
          ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata),
          ...summaryConsistency.metadata
        }
      },
      refs: input.refs
    }
  });
}
