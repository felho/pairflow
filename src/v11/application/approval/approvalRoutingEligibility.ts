import type { BubbleStateSnapshot, MetaReviewRecommendation } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type ProtocolEnvelope,
  type ApprovalDecision
} from "../../../types/protocol.js";
import {
  hasParityInconsistencyMetadata,
  readApprovalTranscriptContext,
  resolveApprovalGateReasonCodeFromRequest,
  resolveApprovalGateRouteFromRequest,
  resolveApprovalRecommendationFromRequest
} from "../../shared/protocol/approvalTranscriptContext.js";
import type { ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";
export {
  hasParityInconsistencyMetadata,
  readApprovalTranscriptContext,
  type ApprovalTranscriptContext
} from "../../shared/protocol/approvalTranscriptContext.js";

export const canonicalHumanApprovalState = "READY_FOR_HUMAN_APPROVAL" as const;

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
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  createError: PairflowCreateCommandError;
}

export function isHumanApprovalState(
  state: BubbleStateSnapshot["state"]
): state is typeof canonicalHumanApprovalState {
  return state === canonicalHumanApprovalState;
}

export function assertApprovalDecisionEligibility(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  if (!isHumanApprovalState(state.state)) {
    throw createError({
      reasonCode: APPROVAL_DECISION_STATE_INELIGIBLE,
      message:
        `approval decision can only be used while bubble is ${canonicalHumanApprovalState} (current: ${state.state}).`,
      context: {
        command_name: "approval",
        current_state: state.state
      }
    });
  }
  if (state.round < 1) {
    throw createError({
      reasonCode: APPROVAL_DECISION_ROUND_INVALID,
      message: `${state.state} state must have round >= 1 (found ${state.round}).`,
      context: {
        command_name: "approval",
        state: state.state,
        round: state.round
      }
    });
  }
}

function resolveLatestApprovalRecommendation(
  latestRoundApprovalRequest: ProtocolEnvelope | undefined,
  createError: PairflowCreateCommandError
): MetaReviewRecommendation {
  const recommendation = resolveApprovalRecommendationFromRequest(
    latestRoundApprovalRequest
  );
  if (recommendation !== undefined) {
    return recommendation;
  }
  throw createError({
    reasonCode: APPROVAL_RECOMMENDATION_UNAVAILABLE,
    message:
      "latest current-round approval request recommendation is unavailable at approval time.",
    context: {
      command_name: "approval"
    }
  });
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
    transcriptContext.latestRoundApprovalRequest,
    input.createError
  );
  metadata.recommendation_at_decision = recommendationAtDecision;
  const parityInconsistencyAtDecision = hasParityInconsistencyMetadata(
    transcriptContext.latestRoundApprovalRequest
  );
  if (parityInconsistencyAtDecision) {
    metadata.findings_parity_inconsistent = true;
  }
  const gateRouteAtDecision = resolveApprovalGateRouteFromRequest(
    transcriptContext.latestRoundApprovalRequest
  );
  const gateReasonCodeAtDecision = resolveApprovalGateReasonCodeFromRequest(
    transcriptContext.latestRoundApprovalRequest
  );
  const gateRouteOverrideRequired =
    gateRouteAtDecision !== undefined && gateRouteAtDecision !== "human_gate_approve";
  if (gateRouteAtDecision !== undefined) {
    metadata.meta_review_gate_route_at_decision = gateRouteAtDecision;
  }
  if (gateReasonCodeAtDecision !== undefined) {
    metadata.meta_review_gate_reason_code_at_decision = gateReasonCodeAtDecision;
  }

  const overrideRequired =
    recommendationAtDecision !== "approve" ||
    parityInconsistencyAtDecision ||
    gateRouteOverrideRequired;
  if (!overrideRequired) {
    return metadata;
  }

  if (input.overrideNonApprove !== true) {
    throw input.createError({
      reasonCode:
        parityInconsistencyAtDecision
          ? APPROVAL_PARITY_OVERRIDE_REQUIRED
          : APPROVAL_OVERRIDE_REQUIRED,
      message:
        parityInconsistencyAtDecision
          ? "approval requires --override-non-approve when findings parity metadata is inconsistent."
          : gateRouteOverrideRequired
            ? `approval requires --override-non-approve when latest approval request route is ${gateRouteAtDecision}.`
          : `approval requires --override-non-approve when latest recommendation is ${recommendationAtDecision}.`,
      context: {
        command_name: "approval",
        recommendation_at_decision: recommendationAtDecision,
        ...(gateRouteAtDecision !== undefined
          ? { meta_review_gate_route_at_decision: gateRouteAtDecision }
          : {}),
        ...(gateReasonCodeAtDecision !== undefined
          ? { meta_review_gate_reason_code_at_decision: gateReasonCodeAtDecision }
          : {})
      }
    });
  }
  if (input.overrideReason === undefined) {
    throw input.createError({
      reasonCode: APPROVAL_OVERRIDE_REASON_REQUIRED,
      message:
        parityInconsistencyAtDecision
          ? "approval override requires --override-reason when findings parity metadata is inconsistent."
          : gateRouteOverrideRequired
            ? `approval override requires --override-reason when latest approval request route is ${gateRouteAtDecision}.`
          : `approval override requires --override-reason when latest recommendation is ${recommendationAtDecision}.`,
      context: {
        command_name: "approval",
        recommendation_at_decision: recommendationAtDecision,
        ...(gateRouteAtDecision !== undefined
          ? { meta_review_gate_route_at_decision: gateRouteAtDecision }
          : {}),
        ...(gateReasonCodeAtDecision !== undefined
          ? { meta_review_gate_reason_code_at_decision: gateReasonCodeAtDecision }
          : {})
      }
    });
  }

  metadata.override_non_approve = true;
  metadata.override_reason = input.overrideReason;
  return metadata;
}
