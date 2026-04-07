import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  resolveFindingsParityMetadataForEnvelope,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion,
  evaluatePositiveSummaryFindingsAssertion
} from "../../../v11/domain/convergence/policy.js";
import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../../infrastructure/artifact/transcript/transcriptStore.js";
import {
  readLatestSameRoundReviewerSnapshotFromTranscript,
  type LatestSameRoundReviewerSnapshot
} from "./metaReviewGateFindingsMetadata.js";
import {
  assertAdvisorySplitMetadataWhenRequired,
  assertApprovePathConsistentWithReviewerSnapshot,
  hasConsistentApproveAdvisoryOnlySplit,
  normalizeApprovalAdvisoryFindings,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot,
  type ApprovalAdvisoryFinding
} from "./metaReviewGateApprovalReviewerConsistency.js";

const approvalSummaryMetadataMismatchReasonCode =
  "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH";
const convergedSummaryFindingsContradictionDefenseInDepthReasonCode =
  "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH";
const convergedAdvisoryCountListMismatchReasonCode =
  "CONVERGED_ADVISORY_COUNT_LIST_MISMATCH";
const approvalSummaryNormalizedReasonCode =
  "META_REVIEW_GATE_APPROVAL_SUMMARY_NORMALIZED";
const approvalSummaryConsistencyStatusMetadataKey =
  "approval_summary_consistency_status";
const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";

function resolveApprovalRequestSummaryConsistency(input: {
  summary: string;
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryFindings: ApprovalAdvisoryFinding[] | undefined;
}): {
  summary: string;
  metadata: Record<string, unknown>;
} {
  if (input.route !== "human_gate_approve") {
    return {
      summary: input.summary,
      metadata: {}
    };
  }

  const parity = resolveStructuredParityMetadataSnapshot(input.parityMetadata);
  const advisoryContractInvariant = resolveAdvisoryContractInvariant({
    parity,
    advisoryFindings: input.advisoryFindings
  });
  const skipAdvisoryCountListMismatchNormalization =
    advisoryContractInvariant.advisoryCountListMismatch &&
    hasConsistentApproveAdvisoryOnlySplit({
      route: input.route,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata
    });
  if (
    advisoryContractInvariant.advisoryCountListMismatch
    && !skipAdvisoryCountListMismatchNormalization
  ) {
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
    (advisoryContractInvariant.advisoryFindingsOpenTotal ?? 0) > 0
    || advisoryContractInvariant.advisoryFindingsListCount > 0;
  const suppressNoFindingsDefenseForScopedBlockingSummary =
    noFindingsAssertion.hasNoFindingsAssertion
    && hasAdvisoryOpenFindings
    && hasConsistentApproveAdvisoryOnlySplit({
      route: input.route,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata
    })
    && !hasGlobalNoFindingsSummaryAssertion(input.summary);
  if (
    noFindingsAssertion.hasNoFindingsAssertion
    && hasAdvisoryOpenFindings
    && !suppressNoFindingsDefenseForScopedBlockingSummary
  ) {
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
  reviewerSnapshot?: LatestSameRoundReviewerSnapshot;
}): Promise<AppendProtocolEnvelopeResult> {
  const appendEnvelope = input.appendEnvelope ?? appendProtocolEnvelope;
  const advisoryFindingsExplicitlyProvided = Object.prototype.hasOwnProperty.call(
    input,
    "findings"
  );
  const normalizedInputAdvisoryFindings = normalizeApprovalAdvisoryFindings(
    input.findings
  );
  const reviewerSnapshot =
    input.reviewerSnapshot ??
    await readLatestSameRoundReviewerSnapshotFromTranscript(
      input.transcriptPath,
      input.round
    );
  const advisoryFindings =
    normalizedInputAdvisoryFindings === undefined &&
    reviewerSnapshot?.advisoryFindings !== undefined
      ? reviewerSnapshot.advisoryFindings.map((finding) => ({ ...finding }))
      : normalizedInputAdvisoryFindings;
  assertAdvisorySplitMetadataWhenRequired({
    route: input.route,
    recommendation: input.recommendation,
    parityMetadata: input.parityMetadata,
    advisoryFindings
  });
  assertApprovePathConsistentWithReviewerSnapshot({
    route: input.route,
    recommendation: input.recommendation,
    summary: input.summary,
    parityMetadata: input.parityMetadata,
    advisoryFindings,
    advisoryFindingsExplicitlyProvided,
    snapshot: reviewerSnapshot
  });
  const summaryConsistency = resolveApprovalRequestSummaryConsistency({
    summary: input.summary,
    route: input.route,
    recommendation: input.recommendation,
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
