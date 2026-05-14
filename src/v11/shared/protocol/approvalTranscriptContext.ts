import type { MetaReviewRecommendation } from "../metaReview/metaReviewTypes.js";
import type { ProtocolEnvelope } from "./protocolEnvelopeContract.js";
import {
  metaReviewGateRoutes,
  type MetaReviewGateRoute
} from "../metaReviewGate/index.js";
import type { ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";

const approvalSummaryConsistencyStatusMetadataKey =
  "approval_summary_consistency_status";
const metaReviewGateRouteSet: ReadonlySet<string> = new Set(metaReviewGateRoutes);

function isMetaReviewGateRoute(value: unknown): value is MetaReviewGateRoute {
  return typeof value === "string" && metaReviewGateRouteSet.has(value);
}

export interface ApprovalTranscriptContext {
  latestRoundApprovalRequest?: ProtocolEnvelope<"APPROVAL_REQUEST">;
}

export function isHumanApprovalRequest(
  envelope: ProtocolEnvelope
): envelope is ProtocolEnvelope<"APPROVAL_REQUEST"> {
  return (
    envelope.type === "APPROVAL_REQUEST" &&
    envelope.sender === "orchestrator" &&
    envelope.recipient === "human"
  );
}

function isHumanApprovalDecision(
  envelope: ProtocolEnvelope
): envelope is ProtocolEnvelope<"APPROVAL_DECISION"> {
  return (
    envelope.type === "APPROVAL_DECISION" &&
    envelope.sender === "human" &&
    envelope.recipient === "orchestrator"
  );
}

export function resolveApprovalRecommendationFromRequest(
  approvalRequest: ProtocolEnvelope | undefined
): MetaReviewRecommendation | undefined {
  if (approvalRequest === undefined || !isHumanApprovalRequest(approvalRequest)) {
    return undefined;
  }
  const metadata = approvalRequest.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return undefined;
  }
  const recommendation = (metadata as Record<string, unknown>).latest_recommendation;
  return recommendation === "approve" ||
    recommendation === "rework" ||
    recommendation === "inconclusive"
    ? recommendation
    : undefined;
}

function readApprovalRequestMetadata(
  approvalRequest: ProtocolEnvelope | undefined
): Record<string, unknown> | undefined {
  if (approvalRequest === undefined || !isHumanApprovalRequest(approvalRequest)) {
    return undefined;
  }
  const metadata = approvalRequest.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return undefined;
  }
  return metadata as Record<string, unknown>;
}

export function resolveApprovalGateRouteFromRequest(
  approvalRequest: ProtocolEnvelope | undefined
): MetaReviewGateRoute | undefined {
  const metadata = readApprovalRequestMetadata(approvalRequest);
  const route = metadata?.meta_review_gate_route;
  return isMetaReviewGateRoute(route) ? route : undefined;
}

export function resolveApprovalGateReasonCodeFromRequest(
  approvalRequest: ProtocolEnvelope | undefined
): string | undefined {
  const metadata = readApprovalRequestMetadata(approvalRequest);
  const reasonCode = metadata?.meta_review_gate_reason_code;
  return typeof reasonCode === "string" ? reasonCode : undefined;
}

export function hasParityInconsistencyMetadata(
  approvalRequest: ProtocolEnvelope | undefined
): boolean {
  const metadata = readApprovalRequestMetadata(approvalRequest);
  const parityMetadata =
    approvalRequest !== undefined && isHumanApprovalRequest(approvalRequest)
      ? approvalRequest.payload.findings_parity
      : undefined;
  if (metadata === undefined && parityMetadata === undefined) {
    return false;
  }
  const summaryConsistencyStatus =
    metadata?.[approvalSummaryConsistencyStatusMetadataKey];
  if (summaryConsistencyStatus === "mismatch") {
    return true;
  }
  const parityStatus = parityMetadata?.findings_parity_status;
  if (parityStatus === "mismatch" || parityStatus === "guard_failed") {
    return true;
  }
  const claimed = parityMetadata?.findings_claimed_open_total;
  const artifact = parityMetadata?.findings_artifact_open_total;
  const hasClaimed =
    typeof claimed === "number" && Number.isInteger(claimed) && claimed >= 0;
  const hasArtifact =
    typeof artifact === "number"
    && Number.isInteger(artifact)
    && artifact >= 0;
  if (hasClaimed && hasArtifact) {
    return claimed !== artifact;
  }
  return false;
}

export async function readApprovalTranscriptContext(
  transcriptPath: string,
  round: number,
  dependencies: {
    readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  }
): Promise<ApprovalTranscriptContext> {
  const transcript = await dependencies.readTranscriptEnvelopes(transcriptPath, {
    allowMissing: true
  });
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index];
    if (envelope === undefined || envelope.round !== round) {
      continue;
    }
    if (isHumanApprovalDecision(envelope)) {
      return {};
    }
    if (!isHumanApprovalRequest(envelope)) {
      continue;
    }
    return {
      latestRoundApprovalRequest: envelope
    };
  }
  return {};
}
