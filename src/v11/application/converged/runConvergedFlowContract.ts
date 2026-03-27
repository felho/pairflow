import type { EnsureBubbleInstanceIdForMutationResult } from "../../../core/bubble/bubbleInstanceId.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { ConvergencePolicyResult } from "../../../core/convergence/policy.js";
import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { PairflowCommandPathAssessment } from "../../../core/runtime/pairflowCommand.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { SummaryVerifierConsistencyGateDecisionRecord } from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import type { ConvergedStructuredFinding } from "../../shared/converged/convergedCommandTypes.js";
import type {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type { MetaReviewGateRoute } from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  AgentName,
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { PrepareConvergedValidationResult } from "./convergedValidationPreparationContract.js";

export interface ExecuteConvergedExecutionDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  applyMetaReviewGateOnConvergence?: typeof applyMetaReviewGateOnConvergence;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
}

export interface RunConvergedFlowInput {
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[];
  now: Date;
  cwd?: string;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
  createError: PairflowCreateCommandError;
  resolveMetaReviewRolloutBlockingReasonCodes: (input: {
    gateRoute: MetaReviewGateRoute;
    metaReviewWarnings: Array<{ reason_code: string }>;
    commandPathStatus: PairflowCommandPathAssessment;
  }) => string[];
}

interface PrepareConvergedRoutingResult {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  state: BubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
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
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

export interface RunConvergedFlowDependencies
  extends ExecuteConvergedExecutionDependencies {
  prepareConvergedRouting: (input: {
    cwd?: string;
    now: Date;
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
  }) => Promise<PrepareConvergedPolicyResult>;
  prepareConvergedValidation: (input: {
    resolved: ResolvedBubbleWorkspace;
    state: BubbleStateSnapshot;
    reviewer: AgentName;
    summary: string;
    nowIso: string;
    createError: PairflowCreateCommandError;
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
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}
