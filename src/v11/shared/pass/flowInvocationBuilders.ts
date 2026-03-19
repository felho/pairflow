import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../../core/bubble/bubbleInstanceId.js";
import type { BubblePaths } from "../../../core/bubble/paths.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { EmitConvergedDependencies } from "../../../core/agent/converged.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassDeliveryDependencies } from "../../application/pass/reviewerDelivery.js";
import type { ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type { PreparePassRoutingResult } from "../../application/pass/passRoutingPreparation.js";
import type {
  RunAutoConvergeFlowDependencies,
  RunAutoConvergeFlowInput
} from "../../application/pass/runAutoConvergeFlow.js";
import type {
  ExecuteAutoConvergeConvergedDependencies,
  ExecuteAutoConvergeConvergedInput
} from "../../application/pass/autoConvergeConvergedExecution.js";
import type {
  FinalizeAutoConvergePassDependencies,
  FinalizeAutoConvergePassInput
} from "../../application/pass/autoConvergeFinalization.js";
import type {
  RunNormalPassFlowDependencies,
  RunNormalPassFlowInput
} from "../../application/pass/runNormalPassFlow.js";
import type {
  PersistNormalPassPostAppendDependencies,
  PersistNormalPassPostAppendInput,
  PersistNormalPassPostAppendResult
} from "../../application/pass/normalPassPostAppendPersistence.js";
import type {
  ExecuteNormalPassDeliveryDependencies,
  ExecuteNormalPassDeliveryInput,
  ExecuteNormalPassDeliveryResult
} from "../../application/pass/normalPassDeliveryExecution.js";
import type {
  FinalizeNormalPassDependencies,
  FinalizeNormalPassInput
} from "../../application/pass/normalPassFinalization.js";

interface BuildFlowBaseInput {
  summary: string;
  refs: string[];
  now: Date;
  nowIso: string;
  findings: Finding[];
  hasFindings: boolean;
  noFindings: boolean;
  resolved: Pick<
    ResolvedBubbleWorkspace,
    "bubbleId" | "bubbleConfig" | "bubblePaths" | "repoPath"
  >;
  bubbleIdentity: Pick<EnsureBubbleInstanceIdForMutationResult, "bubbleInstanceId">;
  handoff: ResolvedPassHandoff;
  reviewer: ResolvedPassHandoff["senderAgent"];
  implementer: ResolvedPassHandoff["recipientAgent"];
  state: BubbleStateSnapshot;
  loadedState: Pick<LoadedStateSnapshot, "fingerprint">;
  passRouting: PreparePassRoutingResult;
  createError: (message: string) => Error;
}

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
  ) => Promise<Awaited<ReturnType<RunAutoConvergeFlowDependencies<TResult>["executeAutoConvergeConverged"]>>>;
  emitConvergedFromWorkspace: ExecuteAutoConvergeConvergedDependencies["emitConvergedFromWorkspace"];
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

export type BuildNormalPassFlowInputInput = BuildFlowBaseInput;

export function buildNormalPassFlowInput(
  input: BuildNormalPassFlowInputInput
): RunNormalPassFlowInput {
  const paths: Pick<
    BubblePaths,
    | "transcriptPath"
    | "reviewVerificationArtifactPath"
    | "statePath"
    | "artifactsDir"
    | "taskArtifactPath"
    | "worktreePath"
    | "sessionsPath"
    | "reviewerBriefArtifactPath"
    | "reviewerFocusArtifactPath"
    | "locksDir"
  > = {
    transcriptPath: input.resolved.bubblePaths.transcriptPath,
    reviewVerificationArtifactPath:
      input.resolved.bubblePaths.reviewVerificationArtifactPath,
    statePath: input.resolved.bubblePaths.statePath,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    taskArtifactPath: input.resolved.bubblePaths.taskArtifactPath,
    worktreePath: input.resolved.bubblePaths.worktreePath,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    reviewerBriefArtifactPath: input.resolved.bubblePaths.reviewerBriefArtifactPath,
    reviewerFocusArtifactPath: input.resolved.bubblePaths.reviewerFocusArtifactPath,
    locksDir: input.resolved.bubblePaths.locksDir
  };

  return {
    now: input.now,
    nowIso: input.nowIso,
    summary: input.summary,
    intent: input.passRouting.intent,
    refs: input.refs,
    hasFindings: input.hasFindings,
    noFindings: input.noFindings,
    findings: input.findings,
    inferredIntent: input.passRouting.inferredIntent,
    reviewerVerification: input.passRouting.reviewerVerification,
    state: input.state,
    expectedStateFingerprint: input.loadedState.fingerprint,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: input.bubbleIdentity.bubbleInstanceId,
    repoPath: input.resolved.repoPath,
    bubbleConfig: input.resolved.bubbleConfig,
    paths,
    handoff: input.handoff,
    ...(input.passRouting.reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim: input.passRouting.reviewerFindingsClaim }
      : {}),
    ...(input.passRouting.reviewerFindingsClaimParserMetadata !== undefined
      ? {
          reviewerFindingsClaimParserMetadata:
            input.passRouting.reviewerFindingsClaimParserMetadata
        }
      : {}),
    repeatClean: {
      reasonCode: input.passRouting.repeatCleanTrigger.reasonCode,
      reasonDetail: input.passRouting.repeatCleanTrigger.reasonDetail,
      trigger: input.passRouting.repeatCleanTrigger.trigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        input.passRouting.repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
    },
    createError: input.createError
  };
}

export interface BuildNormalPassFlowDependenciesInput<TResult> {
  prepareNormalPassAppend:
    RunNormalPassFlowDependencies<TResult>["prepareNormalPassAppend"];
  executeNormalPassAppend:
    RunNormalPassFlowDependencies<TResult>["executeNormalPassAppend"];
  persistNormalPassPostAppend: (
    input: PersistNormalPassPostAppendInput,
    dependencies: PersistNormalPassPostAppendDependencies
  ) => Promise<PersistNormalPassPostAppendResult>;
  writePostAppendReviewVerificationArtifact:
    PersistNormalPassPostAppendDependencies["writePostAppendReviewVerificationArtifact"];
  writePostAppendPassState:
    PersistNormalPassPostAppendDependencies["writePostAppendPassState"];
  updateReviewerDocGateArtifact:
    PersistNormalPassPostAppendDependencies["updateReviewerDocGateArtifact"];
  executeNormalPassDelivery: (
    input: ExecuteNormalPassDeliveryInput,
    dependencies: ExecuteNormalPassDeliveryDependencies
  ) => Promise<ExecuteNormalPassDeliveryResult>;
  resolveReviewerTestDirectiveForPass:
    ExecuteNormalPassDeliveryDependencies["resolveReviewerTestDirectiveForPass"];
  executePassDelivery:
    ExecuteNormalPassDeliveryDependencies["executePassDelivery"];
  emitTmuxDeliveryNotification?: PassDeliveryDependencies["emitTmuxDeliveryNotification"];
  refreshReviewerContext?: PassDeliveryDependencies["refreshReviewerContext"];
  finalizeNormalPass: (
    input: FinalizeNormalPassInput,
    dependencies: FinalizeNormalPassDependencies<TResult>
  ) => Promise<TResult>;
  emitBubbleLifecycleEventBestEffort:
    FinalizeNormalPassDependencies<TResult>["emitBubbleLifecycleEventBestEffort"];
  buildPassLifecycleMetricMetadata:
    FinalizeNormalPassDependencies<TResult>["buildPassLifecycleMetricMetadata"];
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata:
    FinalizeNormalPassDependencies<TResult>["resolveMostRecentPreviousReviewerPassIsCleanFromMetadata"];
  mapPassResultDelivery:
    FinalizeNormalPassDependencies<TResult>["mapPassResultDelivery"];
  buildNormalPassResult:
    FinalizeNormalPassDependencies<TResult>["buildNormalPassResult"];
}

export function buildNormalPassFlowDependencies<TResult>(
  input: BuildNormalPassFlowDependenciesInput<TResult>
): RunNormalPassFlowDependencies<TResult> {
  return {
    prepareNormalPassAppend: input.prepareNormalPassAppend,
    executeNormalPassAppend: input.executeNormalPassAppend,
    persistNormalPassPostAppend: (persistInput) =>
      input.persistNormalPassPostAppend(persistInput, {
        writePostAppendReviewVerificationArtifact:
          input.writePostAppendReviewVerificationArtifact,
        writePostAppendPassState: input.writePostAppendPassState,
        updateReviewerDocGateArtifact: input.updateReviewerDocGateArtifact
      }),
    executeNormalPassDelivery: (deliveryInput) =>
      input.executeNormalPassDelivery(deliveryInput, {
        resolveReviewerTestDirectiveForPass: input.resolveReviewerTestDirectiveForPass,
        executePassDelivery: input.executePassDelivery,
        ...(input.emitTmuxDeliveryNotification !== undefined
          ? { emitTmuxDeliveryNotification: input.emitTmuxDeliveryNotification }
          : {}),
        ...(input.refreshReviewerContext !== undefined
          ? { refreshReviewerContext: input.refreshReviewerContext }
          : {})
      }),
    finalizeNormalPass: (finalizeInput) =>
      input.finalizeNormalPass(finalizeInput, {
        emitBubbleLifecycleEventBestEffort: input.emitBubbleLifecycleEventBestEffort,
        buildPassLifecycleMetricMetadata: input.buildPassLifecycleMetricMetadata,
        resolveMostRecentPreviousReviewerPassIsCleanFromMetadata:
          input.resolveMostRecentPreviousReviewerPassIsCleanFromMetadata,
        mapPassResultDelivery: input.mapPassResultDelivery,
        buildNormalPassResult: input.buildNormalPassResult
      })
  };
}
