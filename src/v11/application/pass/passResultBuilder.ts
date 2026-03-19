import {
  repeatCleanAutoconvergeTriggeredReasonCode,
  type RepeatCleanAutoconvergeReasonCode,
  type RepeatCleanAutoconvergeReasonDetail
} from "../../../core/convergence/repeatCleanAutoconverge.js";
import type { EmitConvergedResult } from "../../../core/agent/converged.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface PassResultDeliveryLike {
  delivered: boolean;
  reason?: string;
  retried: boolean;
}

export interface BuildAutoConvergePassResultInput {
  bubbleId: string;
  inferredIntent: boolean;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  gateRoute: EmitConvergedResult["gateRoute"];
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  delivery?: PassResultDeliveryLike;
  docGateArtifactWriteFailureReason?: string;
}

export interface BuildNormalPassResultInput {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  delivery?: PassResultDeliveryLike;
  docGateArtifactWriteFailureReason?: string;
}

export interface AutoConvergePassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "convergence";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  transitionDecision: "auto_converge";
  repeatCleanReasonCode: typeof repeatCleanAutoconvergeTriggeredReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: true;
  mostRecentPreviousReviewerCleanPassEnvelope: true;
  autoConverged: {
    gateRoute: EmitConvergedResult["gateRoute"];
    convergenceSequence: number;
    convergenceEnvelope: ProtocolEnvelope;
    approvalRequestSequence: number;
    approvalRequestEnvelope: ProtocolEnvelope;
  };
  delivery?: PassResultDeliveryLike;
  docGateArtifactWriteFailureReason?: string;
}

export interface NormalPassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "pass";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  transitionDecision: "normal_pass";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  delivery?: PassResultDeliveryLike;
  docGateArtifactWriteFailureReason?: string;
}

export function buildAutoConvergePassResult(
  input: BuildAutoConvergePassResultInput
): AutoConvergePassResult {
  return {
    bubbleId: input.bubbleId,
    sequence: input.convergenceSequence,
    envelope: input.convergenceEnvelope,
    resultEnvelopeKind: "convergence" as const,
    state: input.state,
    inferredIntent: input.inferredIntent,
    transitionDecision: "auto_converge" as const,
    repeatCleanReasonCode: repeatCleanAutoconvergeTriggeredReasonCode,
    repeatCleanReasonDetail: input.repeatCleanReasonDetail,
    repeatCleanTrigger: true,
    mostRecentPreviousReviewerCleanPassEnvelope: true,
    autoConverged: {
      gateRoute: input.gateRoute,
      convergenceSequence: input.convergenceSequence,
      convergenceEnvelope: input.convergenceEnvelope,
      approvalRequestSequence: input.approvalRequestSequence,
      approvalRequestEnvelope: input.approvalRequestEnvelope
    },
    ...(input.delivery !== undefined
      ? {
          delivery: input.delivery
        }
      : {}),
    ...(input.docGateArtifactWriteFailureReason !== undefined
      ? {
          docGateArtifactWriteFailureReason:
            input.docGateArtifactWriteFailureReason
        }
      : {})
  };
}

export function buildNormalPassResult(
  input: BuildNormalPassResultInput
): NormalPassResult {
  return {
    bubbleId: input.bubbleId,
    sequence: input.sequence,
    envelope: input.envelope,
    resultEnvelopeKind: "pass" as const,
    state: input.state,
    inferredIntent: input.inferredIntent,
    transitionDecision: "normal_pass" as const,
    repeatCleanReasonCode: input.repeatCleanReasonCode,
    repeatCleanReasonDetail: input.repeatCleanReasonDetail,
    repeatCleanTrigger: input.repeatCleanTrigger,
    mostRecentPreviousReviewerCleanPassEnvelope:
      input.mostRecentPreviousReviewerCleanPassEnvelope,
    ...(input.delivery !== undefined
      ? {
          delivery: input.delivery
        }
      : {}),
    ...(input.docGateArtifactWriteFailureReason !== undefined
      ? {
          docGateArtifactWriteFailureReason:
            input.docGateArtifactWriteFailureReason
        }
      : {})
  };
}
