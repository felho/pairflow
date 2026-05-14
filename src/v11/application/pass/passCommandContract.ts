import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../domain/convergence/repeatCleanAutoconverge.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { Finding } from "../../../contracts/kernel/findings.js";
import type { PassIntent } from "../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../shared/protocol/protocolEnvelopeContract.js";
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

interface EmitPassResultBase {
  bubbleId: string;
  sequence: number;
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  activation?: PassActivationProvenance;
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  delivery?: {
    status: "accepted" | "rejected";
    reason?: string;
    reason_code?: string;
    retried: boolean;
  };
  passValidationCompatibilityArtifactWriteFailureReason?: string;
  docGateArtifactWriteFailureReason?: string;
}

export interface EmitNormalPassResult extends EmitPassResultBase {
  envelope: ProtocolEnvelope<"PASS">;
  resultEnvelopeKind: "pass";
  transitionDecision: "normal_pass";
  autoConverged?: never;
}

export interface EmitAutoConvergePassResult extends EmitPassResultBase {
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "convergence";
  transitionDecision: "auto_converge";
  autoConverged: {
    gateRoute: EmitConvergedResult["gateRoute"];
    convergenceSequence: number;
    convergenceEnvelope: ProtocolEnvelope;
    approvalRequestSequence: number;
    approvalRequestEnvelope: ProtocolEnvelope;
  };
}

export type EmitPassResult =
  | EmitNormalPassResult
  | EmitAutoConvergePassResult;

export interface EmitPassDependencies
  extends PassFlowRuntimeDependencies,
    PreparePassWorkspaceContextDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}
