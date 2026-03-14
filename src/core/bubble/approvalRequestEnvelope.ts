import type { MetaReviewRecommendation } from "../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityMetadata
} from "../../types/protocol.js";
import { evaluatePositiveSummaryFindingsAssertion } from "../convergence/policy.js";
import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../protocol/transcriptStore.js";

const approvalSummaryMetadataMismatchReasonCode =
  "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH";
const approvalSummaryNormalizedReasonCode =
  "META_REVIEW_GATE_APPROVAL_SUMMARY_NORMALIZED";
const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";

function resolveStructuredParityMetadataSnapshot(
  parityMetadata: FindingsParityMetadata | null | undefined
): {
  structuredClaim: "clean" | "open_findings" | "unknown";
  parityProofAvailable: boolean;
  claimed: number | null;
  artifact: number | null;
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
  const parityProofAvailable = claimed !== null && artifact !== null && status !== null;

  if ((claimed !== null && claimed > 0) || (artifact !== null && artifact > 0)) {
    return {
      structuredClaim: "open_findings",
      parityProofAvailable,
      claimed,
      artifact,
      status
    };
  }
  if (parityProofAvailable && claimed === 0 && artifact === 0) {
    return {
      structuredClaim: "clean",
      parityProofAvailable,
      claimed,
      artifact,
      status
    };
  }
  return {
    structuredClaim: "unknown",
    parityProofAvailable,
    claimed,
    artifact,
    status
  };
}

function resolveApprovalRequestSummaryConsistency(input: {
  summary: string;
  route: string;
  parityMetadata: FindingsParityMetadata | null | undefined;
}): {
  summary: string;
  metadata: Record<string, unknown>;
} {
  const assertion = evaluatePositiveSummaryFindingsAssertion(input.summary);
  if (!assertion.hasPositiveAssertion) {
    return {
      summary: input.summary,
      metadata: {}
    };
  }

  const parity = resolveStructuredParityMetadataSnapshot(input.parityMetadata);
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
      approval_summary_evaluated_clause_count: assertion.evaluatedClauseCount
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

function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  if (metadata === null || metadata === undefined) {
    return {};
  }
  return {
    findings_claimed_open_total: metadata.findings_claimed_open_total,
    findings_artifact_open_total: metadata.findings_artifact_open_total,
    findings_artifact_status: metadata.findings_artifact_status,
    findings_digest_sha256: metadata.findings_digest_sha256,
    meta_review_run_id: metadata.meta_review_run_id,
    findings_parity_status: metadata.findings_parity_status
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
}): Promise<AppendProtocolEnvelopeResult> {
  const appendEnvelope = input.appendEnvelope ?? appendProtocolEnvelope;
  const summaryConsistency = resolveApprovalRequestSummaryConsistency({
    summary: input.summary,
    route: input.route,
    parityMetadata: input.parityMetadata
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
