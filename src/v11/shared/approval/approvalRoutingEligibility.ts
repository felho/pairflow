import type { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import type { BubbleStateSnapshot, MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type ApprovalDecision,
  type ProtocolEnvelope
} from "../../../types/protocol.js";

export const canonicalHumanApprovalState = "READY_FOR_HUMAN_APPROVAL" as const;
export const legacyHumanApprovalState = "READY_FOR_APPROVAL" as const;
export const metaReviewFailedHumanState = "META_REVIEW_FAILED" as const;

export const approvalOverrideRequiredReasonCode = "APPROVAL_OVERRIDE_REQUIRED";
export const approvalOverrideReasonRequiredReasonCode =
  "APPROVAL_OVERRIDE_REASON_REQUIRED";
export const approvalRecommendationUnavailableReasonCode =
  "APPROVAL_RECOMMENDATION_UNAVAILABLE";
export const approvalParityOverrideRequiredReasonCode =
  "APPROVAL_PARITY_OVERRIDE_REQUIRED";

const metaReviewRunFailedSummaryPrefix = "META_REVIEW_GATE_RUN_FAILED:";
const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";
const metaReviewGateRouteMetadataKey = "meta_review_gate_route";
const metaReviewGateReasonCodeMetadataKey = "meta_review_gate_reason_code";
const metaReviewGateRunFailedMetadataKey = "meta_review_gate_run_failed";

export interface ApprovalTranscriptContext {
  latestRoundApprovalRequest?: ProtocolEnvelope;
  hasRunFailedApprovalRequestHistory: boolean;
}

export interface ResolveApprovalDecisionMetadataInput {
  decision: ApprovalDecision;
  state: BubbleStateSnapshot;
  transcriptPath: string;
  round: number;
  overrideNonApprove?: boolean | undefined;
  overrideReason?: string | undefined;
  readTranscriptEnvelopes: typeof readTranscriptEnvelopes;
  createError: (message: string) => Error;
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

export function isHumanApprovalState(
  state: BubbleStateSnapshot["state"]
): state is
  | typeof canonicalHumanApprovalState
  | typeof legacyHumanApprovalState
  | typeof metaReviewFailedHumanState {
  return (
    state === canonicalHumanApprovalState ||
    state === legacyHumanApprovalState ||
    state === metaReviewFailedHumanState
  );
}

export function assertApprovalDecisionEligibility(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (!isHumanApprovalState(state.state)) {
    throw createError(
      `approval decision can only be used while bubble is ${canonicalHumanApprovalState} or ${metaReviewFailedHumanState} (legacy compatibility: ${legacyHumanApprovalState}) (current: ${state.state}).`
    );
  }
  if (state.round < 1) {
    throw createError(
      `${state.state} state must have round >= 1 (found ${state.round}).`
    );
  }
}

function resolveLatestApprovalRecommendation(
  state: BubbleStateSnapshot,
  context: ApprovalTranscriptContext | undefined,
  createError: (message: string) => Error
): MetaReviewRecommendation {
  const isCompatibilityLegacyWithMetaReview =
    state.state === legacyHumanApprovalState && state.meta_review !== undefined;
  if (
    state.state === legacyHumanApprovalState &&
    state.meta_review === undefined
  ) {
    // Legacy compatibility path: bubbles created before Phase 3 may not have
    // meta_review snapshot data yet. Preserve prior READY_FOR_APPROVAL behavior.
    return "approve";
  }
  const recommendation = state.meta_review?.last_autonomous_recommendation ?? null;
  if (
    recommendation === "approve" ||
    recommendation === "rework" ||
    recommendation === "inconclusive"
  ) {
    return recommendation;
  }
  if (state.state === metaReviewFailedHumanState) {
    return "inconclusive";
  }
  if (
    (state.state === canonicalHumanApprovalState || isCompatibilityLegacyWithMetaReview) &&
    state.meta_review?.sticky_human_gate === true
  ) {
    if (context === undefined) {
      return "inconclusive";
    }
    if (
      isRunFailedApprovalRequest(context.latestRoundApprovalRequest) ||
      context.hasRunFailedApprovalRequestHistory
    ) {
      return "inconclusive";
    }
    if (isCompatibilityLegacyWithMetaReview) {
      return "inconclusive";
    }
    if (
      state.state === canonicalHumanApprovalState
      && context.latestRoundApprovalRequest !== undefined
    ) {
      return "inconclusive";
    }
    if (state.state === canonicalHumanApprovalState) {
      return "inconclusive";
    }
  }
  throw createError(
    `${approvalRecommendationUnavailableReasonCode}: latest autonomous recommendation is unavailable at approval time.`
  );
}

export async function resolveApprovalDecisionMetadata(
  input: ResolveApprovalDecisionMetadataInput
): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {
    [deliveryTargetRoleMetadataKey]: "status"
  };
  if (input.decision !== "approve") {
    return metadata;
  }

  const transcriptContext = await readApprovalTranscriptContext(
    input.transcriptPath,
    input.round,
    {
      readTranscriptEnvelopes: input.readTranscriptEnvelopes
    }
  );
  const recommendationAtDecision = resolveLatestApprovalRecommendation(
    input.state,
    transcriptContext,
    input.createError
  );
  metadata.recommendation_at_decision = recommendationAtDecision;
  const parityInconsistencyAtDecision = hasParityInconsistencyMetadata(
    transcriptContext.latestRoundApprovalRequest
  );
  if (parityInconsistencyAtDecision) {
    metadata.findings_parity_inconsistent = true;
  }

  const overrideRequired =
    recommendationAtDecision !== "approve" || parityInconsistencyAtDecision;
  if (!overrideRequired) {
    return metadata;
  }

  if (input.overrideNonApprove !== true) {
    throw input.createError(
      parityInconsistencyAtDecision
        ? `${approvalParityOverrideRequiredReasonCode}: approval requires --override-non-approve when findings parity metadata is inconsistent.`
        : `${approvalOverrideRequiredReasonCode}: approval requires --override-non-approve when latest recommendation is ${recommendationAtDecision}.`
    );
  }
  if (input.overrideReason === undefined) {
    throw input.createError(
      parityInconsistencyAtDecision
        ? `${approvalOverrideReasonRequiredReasonCode}: approval override requires --override-reason when findings parity metadata is inconsistent.`
        : `${approvalOverrideReasonRequiredReasonCode}: approval override requires --override-reason when latest recommendation is ${recommendationAtDecision}.`
    );
  }

  metadata.override_non_approve = true;
  metadata.override_reason = input.overrideReason;
  return metadata;
}
