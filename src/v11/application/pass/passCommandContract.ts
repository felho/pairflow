import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../core/convergence/repeatCleanAutoconverge.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { ProtocolEnvelope, PassIntent } from "../../../types/protocol.js";
import type { PassDeliveryDependencies } from "./reviewerDelivery.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedResult
} from "../../shared/converged/convergedCommandTypes.js";

export interface EmitPassInput {
  summary: string;
  refs?: string[];
  intent?: PassIntent;
  findings?: Finding[];
  noFindings?: boolean;
  cwd?: string;
  now?: Date;
}

export interface EmitPassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "pass" | "convergence";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  transitionDecision: "normal_pass" | "auto_converge";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  autoConverged?: {
    gateRoute: EmitConvergedResult["gateRoute"];
    convergenceSequence: number;
    convergenceEnvelope: ProtocolEnvelope;
    approvalRequestSequence: number;
    approvalRequestEnvelope: ProtocolEnvelope;
  };
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
  passValidationCompatibilityArtifactWriteFailureReason?: string;
  docGateArtifactWriteFailureReason?: string;
}

export interface EmitPassDependencies extends PassDeliveryDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}
