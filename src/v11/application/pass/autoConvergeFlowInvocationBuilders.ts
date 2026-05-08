import type { EmitConvergedDependencies } from "../converged/convergedCommandOrchestration.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";
import type {
  ExecuteAutoConvergeConvergedDependencies,
  ExecuteAutoConvergeConvergedInput
} from "./autoConvergeConvergedExecution.js";
import type {
  FinalizeAutoConvergePassDependencies,
  FinalizeAutoConvergePassInput
} from "./autoConvergeFinalization.js";
import type {
  RunAutoConvergeFlowDependencies,
  RunAutoConvergeFlowInput
} from "./runAutoConvergeFlow.js";
import type {
  WriteReviewVerificationArtifactAtomicPort
} from "../../ports/reviewVerificationArtifacts.js";

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
    worktreePath: input.resolved.worktreePath,
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
    ...(input.activation !== undefined
      ? { activation: input.activation }
      : {}),
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
    (
      input: Parameters<
        RunAutoConvergeFlowDependencies<TResult>["prepareRepeatCleanAutoConverge"]
      >[0],
      dependencies?: {
        writeReviewVerificationArtifactAtomic?:
          WriteReviewVerificationArtifactAtomicPort;
      }
    ) => ReturnType<
      RunAutoConvergeFlowDependencies<TResult>["prepareRepeatCleanAutoConverge"]
    >;
  writeReviewVerificationArtifactAtomic?:
    WriteReviewVerificationArtifactAtomicPort;
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
  emitDeliveryNotificationAck?:
    EmitConvergedDependencies["emitDeliveryNotificationAck"];
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

function resolveAutoConvergeFlowDeliveryOverride<TResult>(
  input: BuildAutoConvergeFlowDependenciesInput<TResult>
): EmitConvergedDependencies["emitDeliveryNotificationAck"] | undefined {
  return input.emitDeliveryNotificationAck;
}

export function buildAutoConvergeFlowDependencies<TResult>(
  input: BuildAutoConvergeFlowDependenciesInput<TResult>
): RunAutoConvergeFlowDependencies<TResult> {
  const emitDeliveryNotificationAck =
    resolveAutoConvergeFlowDeliveryOverride(input);

  return {
    prepareRepeatCleanAutoConverge: (autoConvergePreparationInput) =>
      input.prepareRepeatCleanAutoConverge(autoConvergePreparationInput, {
        ...(input.writeReviewVerificationArtifactAtomic !== undefined
          ? {
              writeReviewVerificationArtifactAtomic:
                input.writeReviewVerificationArtifactAtomic
            }
          : {})
      }),
    executeAutoConvergeConverged: (autoConvergedInput) =>
      input.executeAutoConvergeConverged(autoConvergedInput, {
        emitConvergedFromWorkspace: input.emitConvergedFromWorkspace,
        ...(emitDeliveryNotificationAck !== undefined
          ? { emitDeliveryNotificationAck }
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
