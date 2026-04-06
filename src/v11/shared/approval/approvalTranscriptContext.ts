import type { readTranscriptEnvelopes } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

const metaReviewRunFailedSummaryPrefix = "META_REVIEW_GATE_RUN_FAILED:";
const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";
const metaReviewGateRouteMetadataKey = "meta_review_gate_route";
const metaReviewGateReasonCodeMetadataKey = "meta_review_gate_reason_code";
const metaReviewGateRunFailedMetadataKey = "meta_review_gate_run_failed";
const approvalSummaryConsistencyStatusMetadataKey =
  "approval_summary_consistency_status";

export interface ApprovalTranscriptContext {
  latestRoundApprovalRequest?: ProtocolEnvelope;
  hasRunFailedApprovalRequestHistory: boolean;
}

function isHumanApprovalRequest(envelope: ProtocolEnvelope): boolean {
  return (
    envelope.type === "APPROVAL_REQUEST" &&
    envelope.sender === "orchestrator" &&
    envelope.recipient === "human"
  );
}

function isRunFailedApprovalRequest(
  approvalRequest: ProtocolEnvelope | undefined
): boolean {
  if (approvalRequest === undefined || !isHumanApprovalRequest(approvalRequest)) {
    return false;
  }
  const metadata = approvalRequest.payload.metadata;
  if (typeof metadata === "object" && metadata !== null) {
    const gateMetadata = metadata as Record<string, unknown>;
    if (gateMetadata[metaReviewGateRunFailedMetadataKey] === true) {
      return true;
    }
    if (gateMetadata[metaReviewGateRouteMetadataKey] === "human_gate_run_failed") {
      return true;
    }
    if (gateMetadata[metaReviewGateReasonCodeMetadataKey] === metaReviewGateRunFailedReasonCode) {
      return true;
    }
  }
  const summary = approvalRequest.payload.summary;
  return (
    typeof summary === "string" &&
    summary.startsWith(metaReviewRunFailedSummaryPrefix)
  );
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
    readTranscriptEnvelopes: typeof readTranscriptEnvelopes;
  }
): Promise<ApprovalTranscriptContext> {
  const transcript = await dependencies.readTranscriptEnvelopes(transcriptPath, {
    allowMissing: true
  });
  let latestRoundApprovalRequest: ProtocolEnvelope | undefined;
  let hasRunFailedApprovalRequestHistory = false;
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index];
    if (envelope === undefined || !isHumanApprovalRequest(envelope)) {
      continue;
    }
    if (
      latestRoundApprovalRequest === undefined &&
      envelope.round === round
    ) {
      latestRoundApprovalRequest = envelope;
    }
    if (envelope.round === round && isRunFailedApprovalRequest(envelope)) {
      hasRunFailedApprovalRequestHistory = true;
    }
    if (
      latestRoundApprovalRequest !== undefined &&
      hasRunFailedApprovalRequestHistory
    ) {
      break;
    }
  }
  return {
    ...(latestRoundApprovalRequest !== undefined
      ? { latestRoundApprovalRequest }
      : {}),
    hasRunFailedApprovalRequestHistory
  };
}
