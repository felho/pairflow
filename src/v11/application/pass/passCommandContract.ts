import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../domain/convergence/repeatCleanAutoconverge.js";
import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent } from "../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { PassFlowRuntimeDependencies } from "./internal/normalPass/passFlowRuntimeDependenciesContract.js";
import type {
  ActorActivationProvenance,
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedResult
} from "../../shared/converged/convergedCommandTypes.js";
import type {
  PreparePassWorkspaceContextDependencies
} from "./internal/normalPass/passWorkspaceContextPreparation.js";

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
  state: PersistedBubbleStateSnapshot;
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

export interface EmitPassDependencies
  extends PassFlowRuntimeDependencies,
    PreparePassWorkspaceContextDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}
