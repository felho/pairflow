import type { EnsureBubbleInstanceIdForMutationResult } from "../../../core/bubble/bubbleInstanceId.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { ConvergencePolicyResult } from "../../../core/convergence/policy.js";
import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { PairflowCommandPathAssessment } from "../../../core/runtime/pairflowCommand.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { SummaryVerifierConsistencyGateDecisionRecord } from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
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

interface ExecuteConvergedExecutionDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  applyMetaReviewGateOnConvergence?: typeof applyMetaReviewGateOnConvergence;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
}

export interface RunConvergedFlowInput {
  summary: string;
  refs: string[];
  now: Date;
  cwd?: string;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
  createError: (message: string) => Error;
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

interface PrepareConvergedValidationResult {
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
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
    createError: (message: string) => Error;
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
    createError: (message: string) => Error;
  }) => Promise<PrepareConvergedValidationResult>;
  executeConvergedExecution: (
    input: {
      resolved: ResolvedBubbleWorkspace;
      state: BubbleStateSnapshot;
      reviewer: AgentName;
      implementer: AgentName;
      summary: string;
      refs: string[];
      now: Date;
      convergencePolicyDiagnostics: string[];
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

function buildExecutionDependencies(
  dependencies: RunConvergedFlowDependencies
): ExecuteConvergedExecutionDependencies {
  return {
    ...(dependencies.applyMetaReviewGateOnConvergence !== undefined
      ? {
          applyMetaReviewGateOnConvergence:
            dependencies.applyMetaReviewGateOnConvergence
        }
      : {}),
    ...(dependencies.recoverMetaReviewGateFromSnapshot !== undefined
      ? {
          recoverMetaReviewGateFromSnapshot:
            dependencies.recoverMetaReviewGateFromSnapshot
        }
      : {}),
    ...(dependencies.emitTmuxDeliveryNotification !== undefined
      ? {
          emitTmuxDeliveryNotification:
            dependencies.emitTmuxDeliveryNotification
        }
      : {}),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {})
  };
}

function buildRoutingInput(input: RunConvergedFlowInput): Parameters<
  RunConvergedFlowDependencies["prepareConvergedRouting"]
>[0] {
  return {
    now: input.now,
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    ...(input.expectedStateFingerprint !== undefined
      ? { expectedStateFingerprint: input.expectedStateFingerprint }
      : {}),
    ...(input.expectedRound !== undefined
      ? { expectedRound: input.expectedRound }
      : {}),
    ...(input.expectedReviewer !== undefined
      ? { expectedReviewer: input.expectedReviewer }
      : {}),
    createError: input.createError
  };
}

export async function runConvergedFlow(
  input: RunConvergedFlowInput,
  dependencies: RunConvergedFlowDependencies
): Promise<RunConvergedFlowResult> {
  const nowIso = input.now.toISOString();
  const routing = await dependencies.prepareConvergedRouting(
    buildRoutingInput(input)
  );
  const policyResult = await dependencies.prepareConvergedPolicy({
    transcriptPath: routing.resolved.bubblePaths.transcriptPath,
    currentRound: routing.state.round,
    reviewer: routing.reviewer,
    implementer: routing.implementer,
    reviewArtifactType: routing.resolved.bubbleConfig.review_artifact_type,
    roundRoleHistory: routing.state.round_role_history,
    severityGateRound: routing.resolved.bubbleConfig.severity_gate_round
  });
  if (!policyResult.policy.ok) {
    const diagnosticsSuffix =
      policyResult.policy.diagnostics.length > 0
        ? ` Diagnostics: ${policyResult.policy.diagnostics.join(" ")}`
        : "";
    // reason_code=CONVERGED_POLICY_VALIDATION_FAILED round
    throw input.createError(
      `Convergence validation failed: ${policyResult.policy.errors.join(" ")}${diagnosticsSuffix}`
    );
  }

  const validationResult = await dependencies.prepareConvergedValidation({
    resolved: routing.resolved,
    state: routing.state,
    reviewer: routing.reviewer,
    summary: input.summary,
    nowIso,
    createError: input.createError
  });
  const executionResult = await dependencies.executeConvergedExecution(
    {
      resolved: routing.resolved,
      state: routing.state,
      reviewer: routing.reviewer,
      implementer: routing.implementer,
      summary: input.summary,
      refs: input.refs,
      now: input.now,
      convergencePolicyDiagnostics: policyResult.convergencePolicyDiagnostics
    },
    buildExecutionDependencies(dependencies)
  );

  return dependencies.finalizeConvergedFlow(
    {
      resolved: routing.resolved,
      bubbleIdentity: routing.bubbleIdentity,
      state: routing.state,
      summary: input.summary,
      refs: input.refs,
      now: input.now,
      convergence: executionResult.convergence,
      gateResult: executionResult.gateResult,
      summaryVerifierGateDecision: validationResult.summaryVerifierGateDecision,
      specLockState: validationResult.specLockState,
      roundGateState: validationResult.roundGateState,
      ...(validationResult.docGateArtifactReadFailureReason !== undefined
        ? {
            docGateArtifactReadFailureReason:
              validationResult.docGateArtifactReadFailureReason
          }
        : {}),
      ...(executionResult.delivery !== undefined
        ? { delivery: executionResult.delivery }
        : {})
    },
    {
      resolveMetaReviewRolloutBlockingReasonCodes:
        input.resolveMetaReviewRolloutBlockingReasonCodes
    }
  );
}
