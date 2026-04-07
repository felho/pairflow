import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";
import type { PassDeliveryDependencies } from "./reviewerDelivery.js";
import type {
  resolvePassValidationForPass as ResolvePassValidationForPassFn,
  ResolvePassValidationForPassDependencies
} from "./passValidationGate.js";
import type {
  ExecuteNormalPassDeliveryDependencies,
  ExecuteNormalPassDeliveryInput,
  ExecuteNormalPassDeliveryResult
} from "./normalPassDeliveryExecution.js";
import type {
  FinalizeNormalPassDependencies,
  FinalizeNormalPassInput
} from "./normalPassFinalization.js";
import type {
  PersistNormalPassPostAppendDependencies,
  PersistNormalPassPostAppendInput,
  PersistNormalPassPostAppendResult
} from "./normalPassPostAppendPersistence.js";
import type {
  RunNormalPassFlowDependencies,
  RunNormalPassFlowInput
} from "./runNormalPassFlow.js";

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
  resolvePassValidationForPass:
    typeof ResolvePassValidationForPassFn;
  resolvePassValidationPolicy:
    ResolvePassValidationForPassDependencies["resolvePassValidationPolicy"];
  runPassValidationCommand:
    ResolvePassValidationForPassDependencies["runPassValidationCommand"];
  buildPassValidationEvidenceArtifact:
    ResolvePassValidationForPassDependencies["buildPassValidationEvidenceArtifact"];
  writePassValidationEvidenceArtifact:
    ResolvePassValidationForPassDependencies["writePassValidationEvidenceArtifact"];
  writePassValidationReviewerCompatibilityArtifact:
    ResolvePassValidationForPassDependencies["writePassValidationReviewerCompatibilityArtifact"];
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
    resolvePassValidationForPass: (passValidationInput) =>
      input.resolvePassValidationForPass(passValidationInput, {
        ...(input.resolvePassValidationPolicy !== undefined
          ? { resolvePassValidationPolicy: input.resolvePassValidationPolicy }
          : {}),
        ...(input.runPassValidationCommand !== undefined
          ? { runPassValidationCommand: input.runPassValidationCommand }
          : {}),
        ...(input.buildPassValidationEvidenceArtifact !== undefined
          ? {
              buildPassValidationEvidenceArtifact:
                input.buildPassValidationEvidenceArtifact
            }
          : {}),
        ...(input.writePassValidationEvidenceArtifact !== undefined
          ? {
              writePassValidationEvidenceArtifact:
                input.writePassValidationEvidenceArtifact
            }
          : {}),
        ...(input.writePassValidationReviewerCompatibilityArtifact !== undefined
          ? {
              writePassValidationReviewerCompatibilityArtifact:
                input.writePassValidationReviewerCompatibilityArtifact
            }
          : {})
      }),
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
