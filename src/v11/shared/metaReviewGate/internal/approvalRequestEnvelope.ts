import type {
  AgentName,
  MetaReviewRecommendation
} from "../../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  resolveFindingsParityMetadataForEnvelope,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";
import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "./metaReviewGateTranscriptDefaults.js";
import {
  readLatestSameRoundReviewerSnapshotFromTranscript,
  type LatestSameRoundReviewerSnapshot
} from "../metaReviewGateReviewerSnapshot.js";
import {
  assertAdvisorySplitMetadataWhenRequired,
  assertApprovePathConsistentWithReviewerSnapshot,
  normalizeApprovalAdvisoryFindings,
  type ApprovalAdvisoryFinding
} from "./metaReviewGateApprovalReviewerConsistency.js";
import { resolveApprovalRequestSummaryConsistency } from "./metaReviewGateApprovalSummaryNormalization.js";
import {
  MetaReviewGateError,
  type MetaReviewGateThresholdMetadata
} from "../metaReviewGateTypes.js";

const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";
const reviewPolicyAutoReworkThresholdNotMetReasonCode =
  "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET";
const reviewPolicyThresholdSourceUnresolvedReasonCode =
  "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED";
const reviewPolicyThresholdContextIncompleteReasonCode =
  "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE";

function resolveThresholdGateRouteMetadata(input: {
  route: string;
  recommendation?: MetaReviewRecommendation;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
}): Record<string, unknown> {
  if (
    input.route !== "human_gate_threshold_not_met"
    && input.route !== "human_gate_threshold_unresolved"
  ) {
    return {};
  }

  const thresholdMetadata = input.thresholdMetadata;
  if (thresholdMetadata === undefined) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: threshold route ${input.route} requires threshold metadata.`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
  if (input.recommendation !== "rework") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: threshold route ${input.route} requires latest_recommendation=rework.`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }

  if (input.route === "human_gate_threshold_not_met") {
    if (
      thresholdMetadata.status !== "not_met"
      || thresholdMetadata.reasonCode
        !== reviewPolicyAutoReworkThresholdNotMetReasonCode
      || thresholdMetadata.minSeverity === undefined
      || thresholdMetadata.highestOpenSeverity === undefined
    ) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "META_REVIEW_GATE_TRANSITION_INVALID: threshold-not-met route requires canonical not_met reason code plus min/highest severity metadata.",
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return {
      meta_review_gate_reason_code: thresholdMetadata.reasonCode,
      meta_review_gate_threshold_status: thresholdMetadata.status,
      meta_review_gate_threshold_min_severity: thresholdMetadata.minSeverity,
      meta_review_gate_threshold_highest_open_severity:
        thresholdMetadata.highestOpenSeverity
    };
  }

  if (
    thresholdMetadata.status !== "unresolved"
    && thresholdMetadata.status !== "incomplete"
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: threshold-unresolved route requires unresolved or incomplete threshold status.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
  if (
    (thresholdMetadata.status === "unresolved"
      && thresholdMetadata.reasonCode
        !== reviewPolicyThresholdSourceUnresolvedReasonCode)
    || (
      thresholdMetadata.status === "incomplete"
      && thresholdMetadata.reasonCode
        !== reviewPolicyThresholdContextIncompleteReasonCode
    )
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: threshold-unresolved route requires the canonical reason code for the supplied threshold status.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }

  return {
    meta_review_gate_reason_code: thresholdMetadata.reasonCode,
    meta_review_gate_threshold_status: thresholdMetadata.status
  };
}

function resolveGateRouteMetadata(input: {
  route: string;
  recommendation?: MetaReviewRecommendation;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
  gateReasonCode?: string;
}): Record<string, unknown> {
  const metadata = {
    meta_review_gate_route: input.route,
    ...resolveThresholdGateRouteMetadata(input),
    ...(input.gateReasonCode !== undefined
      ? { meta_review_gate_reason_code: input.gateReasonCode }
      : {})
  };
  if (input.route !== "human_gate_run_failed") {
    return metadata;
  }
  return {
    ...metadata,
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
  metaReviewerAgent: AgentName;
  parityMetadata?: FindingsParityMetadata | null | undefined;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
  gateReasonCode?: string;
  findings?: ApprovalAdvisoryFinding[];
  reviewerSnapshot?: LatestSameRoundReviewerSnapshot;
  consecutiveCleanRuns?: number;
}): Promise<AppendProtocolEnvelopeResult> {
  const appendEnvelope = input.appendEnvelope ?? appendProtocolEnvelope;
  if (
    input.route === "human_gate_approve" &&
    input.thresholdMetadata !== undefined
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: human_gate_approve cannot carry threshold diagnostic metadata; threshold-guarded approve must fail closed before approval request emission.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
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
          actor_agent: input.metaReviewerAgent,
          ...(input.recommendation !== undefined
            ? { latest_recommendation: input.recommendation }
            : {}),
          ...(input.consecutiveCleanRuns !== undefined
            ? { consecutive_clean_runs: input.consecutiveCleanRuns }
            : {}),
          ...resolveGateRouteMetadata({
            route: input.route,
            ...(input.recommendation !== undefined
              ? { recommendation: input.recommendation }
              : {}),
            ...(input.thresholdMetadata !== undefined
              ? { thresholdMetadata: input.thresholdMetadata }
              : {}),
            ...(input.gateReasonCode !== undefined
              ? { gateReasonCode: input.gateReasonCode }
              : {})
          }),
          ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata),
          ...summaryConsistency.metadata
        }
      },
      refs: input.refs
    }
  });
}
