import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../v11/domain/convergence/repeatCleanAutoconverge.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { ProtocolEnvelope, PassIntent } from "../../../types/protocol.js";
import type { PassFlowRuntimeDependencies } from "./passFlowRuntimeDependenciesContract.js";
import type {
  ActorActivationProvenance,
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedResult
} from "../../shared/converged/convergedCommandTypes.js";

export type PassActivationProvenance = ActorActivationProvenance;

export interface EmitPassInput {
  summary: string;
  refs?: string[];
  intent?: PassIntent;
  findings?: Finding[];
  noFindings?: boolean;
  cwd?: string;
  authoritativeContext?: ActorEmitContextSnapshot;
  now?: Date;
}

export interface EmitPassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "pass" | "convergence";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  activation?: PassActivationProvenance;
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
    status: "accepted" | "rejected";
    reason?: string;
    reason_code?: string;
    retried: boolean;
  };
  passValidationCompatibilityArtifactWriteFailureReason?: string;
  docGateArtifactWriteFailureReason?: string;
}

export interface EmitPassDependencies extends PassFlowRuntimeDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}
