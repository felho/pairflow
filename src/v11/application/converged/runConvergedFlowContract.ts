import type { EnsureBubbleInstanceIdForMutationResult } from "../../ports/bubbleIdentity.js";
import type { ResolvedBubbleWorkspace } from "../../ports/workspaceResolution.js";
import type { ActorEmitContextSnapshot } from "../../shared/actorProtocol/actorEmitContext.js";
import type { ConvergencePolicyResult } from "../../../v11/domain/convergence/policy.js";
import type { EmitBubbleNotificationPort } from "../../ports/notifications.js";
import type { PairflowCommandPathAssessment } from "../../ports/pairflowCommand.js";
import type {
  EmitDeliveryNotificationAckPort
} from "../../ports/tmuxDelivery.js";
import type { ResolveReviewerTestExecutionDirectivePort } from "../../ports/reviewerTestEvidenceArtifacts.js";
import type { SummaryVerifierConsistencyGateDecisionRecord } from "../../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import type { ConvergedStructuredFinding } from "../../shared/converged/convergedCommandTypes.js";
import type { MetaReviewGateRoute } from "../../shared/metaReviewGate/index.js";
import type {
  ApplyMetaReviewGateOnConvergencePort
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  AgentName
} from "../../domain/agentIdentity/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../shared/gates/gateStateTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { PrepareConvergedValidationResult } from "./convergedValidationPreparationContract.js";

export interface ExecuteConvergedExecutionDependencies {
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitBubbleNotificationPort;
  applyMetaReviewGateOnConvergence?: ApplyMetaReviewGateOnConvergencePort;
}

export interface RunConvergedFlowInput {
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[];
  now: Date;
  cwd?: string;
  authoritativeContext?: ActorEmitContextSnapshot;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
  createError: PairflowCreateCommandError;
  resolveMetaReviewRolloutBlockingReasonCodes: (input: {
    gateRoute: MetaReviewGateRoute;
    commandPathStatus: PairflowCommandPathAssessment;
  }) => string[];
}

interface PrepareConvergedRoutingResult {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  state: BubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
  effectiveLoopMode: "full" | "meta_only";
}

interface PrepareConvergedPolicyResult {
  transcript: ProtocolEnvelope[];
  policy: ConvergencePolicyResult;
  convergencePolicyDiagnostics: string[];
}

interface ExecuteConvergedExecutionResult {
  convergence: {
    sequence: number;
    envelope: ProtocolEnvelope;
    mirrorWriteFailures: Array<{
      path: string;
      message: string;
      code?: string;
    }>;
  };
  gateResult: {
    route: MetaReviewGateRoute;
    gateSequence: number;
    gateEnvelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    metaReviewRun?: {
      status: string;
      recommendation: string;
      warnings?: Array<{ reason_code: string }>;
      rework_target_message?: string | null;
    };
  };
  delivery?: {
    status: "accepted" | "rejected";
    reason?: string;
    reason_code?: string;
    retried: boolean;
  };
}

export interface RunConvergedFlowDependencies
  extends ExecuteConvergedExecutionDependencies {
  resolveReviewerTestExecutionDirective?:
    ResolveReviewerTestExecutionDirectivePort;
  prepareConvergedRouting: (input: {
    cwd?: string;
    now: Date;
    authoritativeContext?: ActorEmitContextSnapshot;
    expectedStateFingerprint?: string;
    expectedRound?: number;
    expectedReviewer?: AgentName;
    createError: PairflowCreateCommandError;
  }) => Promise<PrepareConvergedRoutingResult>;
  prepareConvergedPolicy: (input: {
    transcriptPath: string;
    currentRound: number;
    reviewer: AgentName;
    implementer: AgentName;
    reviewArtifactType: ResolvedBubbleWorkspace["bubbleConfig"]["review_artifact_type"];
    roundRoleHistory: BubbleStateSnapshot["round_role_history"];
    severityGateRound: number;
    effectiveLoopMode: PrepareConvergedRoutingResult["effectiveLoopMode"];
  }) => Promise<PrepareConvergedPolicyResult>;
  prepareConvergedValidation: (input: {
    resolved: ResolvedBubbleWorkspace;
    state: BubbleStateSnapshot;
    reviewer: AgentName;
    summary: string;
    nowIso: string;
    createError: PairflowCreateCommandError;
  }, dependencies?: {
    resolveReviewerTestExecutionDirective?: ResolveReviewerTestExecutionDirectivePort;
  }) => Promise<PrepareConvergedValidationResult>;
  executeConvergedExecution: (
    input: {
      resolved: ResolvedBubbleWorkspace;
      state: BubbleStateSnapshot;
      reviewer: AgentName;
      implementer: AgentName;
      summary: string;
      refs: string[];
      findings?: ConvergedStructuredFinding[];
      now: Date;
      convergencePolicyDiagnostics: string[];
      gatePipelineDiagnostics: string[];
    },
    dependencies?: ExecuteConvergedExecutionDependencies
  ) => Promise<ExecuteConvergedExecutionResult>;
  finalizeConvergedFlow: (
    input: {
      resolved: ResolvedBubbleWorkspace;
      bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
      state: BubbleStateSnapshot;
      summary: string;
      refs: string[];
      now: Date;
      convergence: ExecuteConvergedExecutionResult["convergence"];
      gateResult: ExecuteConvergedExecutionResult["gateResult"];
      summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
      specLockState: BubbleSpecLockState;
      roundGateState: BubbleRoundGateState;
      docGateArtifactReadFailureReason?: string;
      delivery?: NonNullable<ExecuteConvergedExecutionResult["delivery"]>;
    },
    dependencies: {
      resolveMetaReviewRolloutBlockingReasonCodes:
        RunConvergedFlowInput["resolveMetaReviewRolloutBlockingReasonCodes"];
    }
  ) => Promise<RunConvergedFlowResult>;
}

export interface RunConvergedFlowResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: {
    status: "accepted" | "rejected";
    reason?: string;
    reason_code?: string;
    retried: boolean;
  };
}
