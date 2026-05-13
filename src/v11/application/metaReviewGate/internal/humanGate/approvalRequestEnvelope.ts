import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  MetaReviewRecommendation
} from "../../../../shared/metaReview/metaReviewTypes.js";
import {
  deliveryTargetRoleMetadataKey
} from "../../../../../types/protocol.js";
import {
  resolveFindingsParityMetadataForEnvelope,
  type FindingsParityMetadata
} from "../../../../shared/metaReviewGate/findingsParityMetadataContract.js";
import {
  appendProtocolEnvelope
} from "../../../start/startCommandDependencyDefaults.js";
import type {
  AppendProtocolEnvelopeResult
} from "../../../../ports/transcript.js";
import {
  readLatestSameRoundReviewerSnapshotFromTranscript,
  type LatestSameRoundReviewerSnapshot
} from "../../metaReviewGateReviewerSnapshotApi.js";
import {
  assertAdvisorySplitMetadataWhenRequired,
  assertApprovePathConsistentWithReviewerSnapshot,
  normalizeApprovalAdvisoryFindings,
  type ApprovalAdvisoryFinding
} from "./metaReviewGateApprovalReviewerConsistency.js";
import { resolveApprovalRequestSummaryConsistency } from "../../../../domain/metaReviewGate/approvalSummaryNormalization.js";
import { resolveApprovalRequestGateRouteMetadata } from "../../../../domain/metaReviewGate/approvalRequestRouteMetadata.js";
import {
  MetaReviewGateError,
  type MetaReviewGateThresholdMetadata
} from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";

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
          ...resolveApprovalRequestGateRouteMetadata({
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
