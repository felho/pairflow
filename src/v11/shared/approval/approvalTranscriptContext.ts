import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReadTranscriptEnvelopesPort } from "../ports/transcript.js";

const approvalSummaryConsistencyStatusMetadataKey =
  "approval_summary_consistency_status";

export interface ApprovalTranscriptContext {
  latestRoundApprovalRequest?: ProtocolEnvelope;
}

export function isHumanApprovalRequest(envelope: ProtocolEnvelope): boolean {
  return (
    envelope.type === "APPROVAL_REQUEST" &&
    envelope.sender === "orchestrator" &&
    envelope.recipient === "human"
  );
}

function isHumanApprovalDecision(envelope: ProtocolEnvelope): boolean {
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

export function hasParityInconsistencyMetadata(
  approvalRequest: ProtocolEnvelope | undefined
): boolean {
  if (approvalRequest === undefined || !isHumanApprovalRequest(approvalRequest)) {
    return false;
  }
  const metadata = approvalRequest.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return false;
  }
  const parityMetadata = metadata as Record<string, unknown>;
  const summaryConsistencyStatus =
    parityMetadata[approvalSummaryConsistencyStatusMetadataKey];
  if (summaryConsistencyStatus === "mismatch") {
    return true;
  }
  const parityStatus = parityMetadata.findings_parity_status;
  if (parityStatus === "mismatch" || parityStatus === "guard_failed") {
    return true;
  }
  const claimed = parityMetadata.findings_claimed_open_total;
  const artifact = parityMetadata.findings_artifact_open_total;
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
