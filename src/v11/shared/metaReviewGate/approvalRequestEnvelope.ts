import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  resolveFindingsParityMetadataForEnvelope,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
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
  normalizeApprovalAdvisoryFindings,
  type ApprovalAdvisoryFinding
} from "./metaReviewGateApprovalReviewerConsistency.js";
import { resolveApprovalRequestSummaryConsistency } from "./metaReviewGateApprovalSummaryNormalization.js";

const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";

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
