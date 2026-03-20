import type { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import type { BubbleStateSnapshot, MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type ApprovalDecision
} from "../../../types/protocol.js";
import {
  hasParityInconsistencyMetadata,
  readApprovalTranscriptContext
} from "./approvalTranscriptContext.js";
export {
  hasParityInconsistencyMetadata,
  readApprovalTranscriptContext,
  type ApprovalTranscriptContext
} from "./approvalTranscriptContext.js";

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
const APPROVAL_DECISION_STATE_INELIGIBLE =
  "APPROVAL_DECISION_STATE_INELIGIBLE";
const APPROVAL_DECISION_ROUND_INVALID = "APPROVAL_DECISION_ROUND_INVALID";
const APPROVAL_OVERRIDE_REQUIRED = approvalOverrideRequiredReasonCode;
const APPROVAL_OVERRIDE_REASON_REQUIRED = approvalOverrideReasonRequiredReasonCode;
const APPROVAL_RECOMMENDATION_UNAVAILABLE = approvalRecommendationUnavailableReasonCode;
const APPROVAL_PARITY_OVERRIDE_REQUIRED = approvalParityOverrideRequiredReasonCode;

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
      `${APPROVAL_DECISION_STATE_INELIGIBLE}: approval decision can only be used while bubble is ${canonicalHumanApprovalState} or ${metaReviewFailedHumanState} (legacy compatibility: ${legacyHumanApprovalState}) (current: ${state.state}).`
    );
  }
  if (state.round < 1) {
    throw createError(
      `${APPROVAL_DECISION_ROUND_INVALID}: ${state.state} state must have round >= 1 (found ${state.round}).`
    );
  }
}

function resolveLatestApprovalRecommendation(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): MetaReviewRecommendation {
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
  const isCompatibilityLegacyWithMetaReview =
    state.state === legacyHumanApprovalState && state.meta_review !== undefined;
  const stickyHumanGateRoute =
    state.meta_review?.sticky_human_gate === true &&
    (state.state === canonicalHumanApprovalState || isCompatibilityLegacyWithMetaReview);
  if (stickyHumanGateRoute) {
    return "inconclusive";
  }
  throw createError(
    `${APPROVAL_RECOMMENDATION_UNAVAILABLE}: latest autonomous recommendation is unavailable at approval time. context: command_name=approval.`
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
        ? `${APPROVAL_PARITY_OVERRIDE_REQUIRED}: approval requires --override-non-approve when findings parity metadata is inconsistent. context: command_name=approval.`
        : `${APPROVAL_OVERRIDE_REQUIRED}: approval requires --override-non-approve when latest recommendation is ${recommendationAtDecision}. context: command_name=approval.`
    );
  }
  if (input.overrideReason === undefined) {
    throw input.createError(
      parityInconsistencyAtDecision
        ? `${APPROVAL_OVERRIDE_REASON_REQUIRED}: approval override requires --override-reason when findings parity metadata is inconsistent. context: command_name=approval.`
        : `${APPROVAL_OVERRIDE_REASON_REQUIRED}: approval override requires --override-reason when latest recommendation is ${recommendationAtDecision}. context: command_name=approval.`
    );
  }

  metadata.override_non_approve = true;
  metadata.override_reason = input.overrideReason;
  return metadata;
}
