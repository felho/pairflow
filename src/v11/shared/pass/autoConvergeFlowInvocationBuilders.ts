import type { EmitConvergedDependencies } from "../../../core/agent/converged.js";
import type {
  ExecuteAutoConvergeConvergedDependencies,
  ExecuteAutoConvergeConvergedInput
} from "../../application/pass/autoConvergeConvergedExecution.js";
import type {
  FinalizeAutoConvergePassDependencies,
  FinalizeAutoConvergePassInput
} from "../../application/pass/autoConvergeFinalization.js";
import type {
  RunAutoConvergeFlowDependencies,
  RunAutoConvergeFlowInput
} from "../../application/pass/runAutoConvergeFlow.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";

export interface BuildAutoConvergeFlowInputInput extends BuildFlowBaseInput {
  onDownstreamRejected: (reason: string) => never;
}

export function buildAutoConvergeFlowInput(
  input: BuildAutoConvergeFlowInputInput
): RunAutoConvergeFlowInput {
  return {
    summary: input.summary,
    refs: input.refs,
    now: input.now,
    nowIso: input.nowIso,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: input.bubbleIdentity.bubbleInstanceId,
    repoPath: input.resolved.repoPath,
    bubbleConfig: input.resolved.bubbleConfig,
    worktreePath: input.resolved.bubblePaths.worktreePath,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    taskArtifactPath: input.resolved.bubblePaths.taskArtifactPath,
    statePath: input.resolved.bubblePaths.statePath,
    reviewVerificationArtifactPath:
      input.resolved.bubblePaths.reviewVerificationArtifactPath,
    handoff: input.handoff,
    reviewer: input.reviewer,
    implementer: input.implementer,
    roundRoleHistory: input.state.round_role_history,
    transcript: input.passRouting.transcript,
    severityGateRound: input.resolved.bubbleConfig.severity_gate_round,
    expectedStateFingerprint: input.loadedState.fingerprint,
    reviewerVerification: input.passRouting.reviewerVerification,
    passIntent: input.passRouting.intent,
    inferredIntent: input.passRouting.inferredIntent,
    hasFindings: input.hasFindings,
    noFindings: input.noFindings,
    findings: input.findings,
    ...(input.passRouting.reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim: input.passRouting.reviewerFindingsClaim }
      : {}),
    ...(input.passRouting.reviewerFindingsClaimParserMetadata !== undefined
      ? {
          reviewerFindingsClaimParserMetadata:
            input.passRouting.reviewerFindingsClaimParserMetadata
        }
      : {}),
    repeatCleanReasonCode: input.passRouting.repeatCleanTrigger.reasonCode,
    repeatCleanReasonDetail: input.passRouting.repeatCleanTrigger.reasonDetail,
    repeatCleanTrigger: input.passRouting.repeatCleanTrigger.trigger,
    mostRecentPreviousReviewerCleanPassEnvelope:
      input.passRouting.repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope,
    createError: input.createError,
    onDownstreamRejected: input.onDownstreamRejected
  };
}

export interface BuildAutoConvergeFlowDependenciesInput<TResult> {
  prepareRepeatCleanAutoConverge:
    RunAutoConvergeFlowDependencies<TResult>["prepareRepeatCleanAutoConverge"];
  executeAutoConvergeConverged: (
    input: ExecuteAutoConvergeConvergedInput,
    dependencies: ExecuteAutoConvergeConvergedDependencies
  ) => Promise<
    Awaited<
      ReturnType<RunAutoConvergeFlowDependencies<TResult>["executeAutoConvergeConverged"]>
    >
  >;
  emitConvergedFromWorkspace:
    ExecuteAutoConvergeConvergedDependencies["emitConvergedFromWorkspace"];
  emitTmuxDeliveryNotification?: EmitConvergedDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
  finalizeAutoConvergePass: (
    input: FinalizeAutoConvergePassInput,
    dependencies: FinalizeAutoConvergePassDependencies<TResult>
  ) => Promise<TResult>;
  updateReviewerDocGateArtifact:
    FinalizeAutoConvergePassDependencies<TResult>["updateReviewerDocGateArtifact"];
  emitBubbleLifecycleEventBestEffort:
    FinalizeAutoConvergePassDependencies<TResult>["emitBubbleLifecycleEventBestEffort"];
  buildPassLifecycleMetricMetadata:
    FinalizeAutoConvergePassDependencies<TResult>["buildPassLifecycleMetricMetadata"];
  buildAutoConvergePassResult:
    FinalizeAutoConvergePassDependencies<TResult>["buildAutoConvergePassResult"];
}

export function buildAutoConvergeFlowDependencies<TResult>(
  input: BuildAutoConvergeFlowDependenciesInput<TResult>
): RunAutoConvergeFlowDependencies<TResult> {
  return {
    prepareRepeatCleanAutoConverge: input.prepareRepeatCleanAutoConverge,
    executeAutoConvergeConverged: (autoConvergedInput) =>
      input.executeAutoConvergeConverged(autoConvergedInput, {
        emitConvergedFromWorkspace: input.emitConvergedFromWorkspace,
        ...(input.emitTmuxDeliveryNotification !== undefined
          ? { emitTmuxDeliveryNotification: input.emitTmuxDeliveryNotification }
          : {}),
        ...(input.emitBubbleNotification !== undefined
          ? { emitBubbleNotification: input.emitBubbleNotification }
          : {})
      }),
    finalizeAutoConvergePass: (autoConvergeFinalizationInput) =>
      input.finalizeAutoConvergePass(autoConvergeFinalizationInput, {
        updateReviewerDocGateArtifact: input.updateReviewerDocGateArtifact,
        emitBubbleLifecycleEventBestEffort: input.emitBubbleLifecycleEventBestEffort,
        buildPassLifecycleMetricMetadata: input.buildPassLifecycleMetricMetadata,
        buildAutoConvergePassResult: input.buildAutoConvergePassResult
      })
  };
}
