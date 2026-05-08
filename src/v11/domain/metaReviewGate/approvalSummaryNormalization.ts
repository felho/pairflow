import type { MetaReviewRecommendation } from "../../shared/metaReview/metaReviewTypes.js";
import {
  evaluateNoFindingsSummaryFindingsAssertion,
  hasGlobalNoFindingsSummaryAssertion,
  evaluatePositiveSummaryFindingsAssertion
} from "../convergence/policy.js";
import {
  hasConsistentApproveAdvisoryOnlySplit,
  resolveAdvisoryContractInvariant,
  resolveStructuredParityMetadataSnapshot,
  type ApprovalAdvisoryFinding
} from "./approvalParitySnapshot.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";

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

function isConsistentApproveAdvisoryOnlyRoute(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  parityMetadata: FindingsParityMetadata | null | undefined;
}): boolean {
  return hasConsistentApproveAdvisoryOnlySplit({
    route: input.route,
    recommendation: input.recommendation,
    parityMetadata: input.parityMetadata
  });
}

function shouldSkipAdvisoryCountMismatchNormalization(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  parityMetadata: FindingsParityMetadata | null | undefined;
  advisoryCountListMismatch: boolean;
}): boolean {
  return (
    input.advisoryCountListMismatch &&
    isConsistentApproveAdvisoryOnlyRoute({
      route: input.route,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata
    })
  );
}

function shouldSuppressNoFindingsDefense(input: {
  route: string;
  recommendation: MetaReviewRecommendation | undefined;
  parityMetadata: FindingsParityMetadata | null | undefined;
  noFindingsAssertion: ReturnType<typeof evaluateNoFindingsSummaryFindingsAssertion>;
  hasAdvisoryOpenFindings: boolean;
  summary: string;
}): boolean {
  return (
    input.noFindingsAssertion.hasNoFindingsAssertion &&
    input.hasAdvisoryOpenFindings &&
    isConsistentApproveAdvisoryOnlyRoute({
      route: input.route,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata
    }) &&
    !hasGlobalNoFindingsSummaryAssertion(input.summary)
  );
}

export function resolveApprovalRequestSummaryConsistency(input: {
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
    shouldSkipAdvisoryCountMismatchNormalization({
      route: input.route,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata,
      advisoryCountListMismatch:
        advisoryContractInvariant.advisoryCountListMismatch
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
    shouldSuppressNoFindingsDefense({
      route: input.route,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata,
      noFindingsAssertion,
      hasAdvisoryOpenFindings,
      summary: input.summary
    });
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
