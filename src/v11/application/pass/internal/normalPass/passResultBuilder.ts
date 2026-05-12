import {
  repeatCleanAutoconvergeTriggeredReasonCode,
  type RepeatCleanAutoconvergeReasonCode,
  type RepeatCleanAutoconvergeReasonDetail
} from "../../../../domain/convergence/repeatCleanAutoconverge.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";
import type { EmitConvergedResult } from "../../../converged/convergedCommandOrchestration.js";
import type { PassActivationProvenance } from "../../passCommandContract.js";

export interface PassResultDeliveryLike {
  status: "accepted" | "rejected";
  reason?: string;
  reason_code?: string;
  retried: boolean;
}

export interface BuildAutoConvergePassResultInput {
  bubbleId: string;
  inferredIntent: boolean;
  activation?: PassActivationProvenance;
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
  activation?: PassActivationProvenance;
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  delivery?: PassResultDeliveryLike;
  passValidationCompatibilityArtifactWriteFailureReason?: string;
  docGateArtifactWriteFailureReason?: string;
}

export interface AutoConvergePassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "convergence";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  activation?: PassActivationProvenance;
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
  activation?: PassActivationProvenance;
  transitionDecision: "normal_pass";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  delivery?: PassResultDeliveryLike;
  passValidationCompatibilityArtifactWriteFailureReason?: string;
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
    ...(input.activation !== undefined
      ? {
          activation: input.activation
        }
      : {}),
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
    ...(input.activation !== undefined
      ? {
          activation: input.activation
        }
      : {}),
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
    ...(input.passValidationCompatibilityArtifactWriteFailureReason !== undefined
      ? {
          passValidationCompatibilityArtifactWriteFailureReason:
            input.passValidationCompatibilityArtifactWriteFailureReason
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
