import type { BubblePaths } from "../../../../shared/bubble/bubblePaths.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";
import type { PassDeliveryDependencies } from "../reviewerDelivery/reviewerDelivery.js";
import type {
  resolvePassValidationForPass as ResolvePassValidationForPassFn,
  ResolvePassValidationForPassDependencies
} from "../verification/passValidationGate.js";
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
import type {
  WriteReviewVerificationArtifactAtomicPort
} from "../../../../ports/reviewVerificationArtifacts.js";

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
    worktreePath: input.resolved.worktreePath,
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
    ...(input.activation !== undefined
      ? { activation: input.activation }
      : {}),
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
  createPassValidationReviewerDirective?:
    ResolvePassValidationForPassDependencies["createPassValidationReviewerDirective"];
  resolvePassValidationArtifactPath?:
    ResolvePassValidationForPassDependencies["resolvePassValidationArtifactPath"];
  resolvePassValidationReviewerCompatibilityArtifactPath?:
    ResolvePassValidationForPassDependencies["resolvePassValidationReviewerCompatibilityArtifactPath"];
  isPassValidationRunnerExecutionError?:
    ResolvePassValidationForPassDependencies["isPassValidationRunnerExecutionError"];
  writePassValidationEvidenceArtifact:
    ResolvePassValidationForPassDependencies["writePassValidationEvidenceArtifact"];
  writePassValidationReviewerCompatibilityArtifact:
    ResolvePassValidationForPassDependencies["writePassValidationReviewerCompatibilityArtifact"];
  writeReviewVerificationArtifactAtomic?: WriteReviewVerificationArtifactAtomicPort;
  persistNormalPassPostAppend: (
    input: PersistNormalPassPostAppendInput,
    dependencies: PersistNormalPassPostAppendDependencies
  ) => Promise<PersistNormalPassPostAppendResult>;
  writePostAppendReviewVerificationArtifact:
    (
      input: Parameters<
        PersistNormalPassPostAppendDependencies["writePostAppendReviewVerificationArtifact"]
      >[0],
      dependencies?: {
        writeReviewVerificationArtifactAtomic?:
          WriteReviewVerificationArtifactAtomicPort;
      }
    ) => ReturnType<
      PersistNormalPassPostAppendDependencies["writePostAppendReviewVerificationArtifact"]
    >;
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
  emitDeliveryNotificationAck?: PassDeliveryDependencies["emitDeliveryNotificationAck"];
  refreshReviewerContext?: PassDeliveryDependencies["refreshReviewerContext"];
  readReviewerBriefArtifact?: PassDeliveryDependencies["readReviewerBriefArtifact"];
  readReviewerFocusArtifact?: PassDeliveryDependencies["readReviewerFocusArtifact"];
  resolveDeliveryMessageRef?: PassDeliveryDependencies["resolveDeliveryMessageRef"];
  verifyImplementerTestEvidence?: PassDeliveryDependencies["verifyImplementerTestEvidence"];
  writeReviewerTestEvidenceArtifact?: PassDeliveryDependencies["writeReviewerTestEvidenceArtifact"];
  resolveReviewerTestExecutionDirectiveFromArtifact?:
    PassDeliveryDependencies["resolveReviewerTestExecutionDirectiveFromArtifact"];
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

function resolveNormalPassFlowDeliveryOverride<TResult>(
  input: BuildNormalPassFlowDependenciesInput<TResult>
): PassDeliveryDependencies["emitDeliveryNotificationAck"] | undefined {
  return input.emitDeliveryNotificationAck;
}

function buildPostAppendReviewVerificationWriter<TResult>(
  input: Pick<
    BuildNormalPassFlowDependenciesInput<TResult>,
    "writePostAppendReviewVerificationArtifact" | "writeReviewVerificationArtifactAtomic"
  >
): PersistNormalPassPostAppendDependencies["writePostAppendReviewVerificationArtifact"] {
  return (verificationInput) =>
    input.writePostAppendReviewVerificationArtifact(verificationInput, {
      ...(input.writeReviewVerificationArtifactAtomic !== undefined
        ? {
            writeReviewVerificationArtifactAtomic:
              input.writeReviewVerificationArtifactAtomic
          }
        : {})
    });
}

export function buildNormalPassFlowDependencies<TResult>(
  input: BuildNormalPassFlowDependenciesInput<TResult>
): RunNormalPassFlowDependencies<TResult> {
  const emitDeliveryNotificationAck =
    resolveNormalPassFlowDeliveryOverride(input);

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
        ...(input.createPassValidationReviewerDirective !== undefined
          ? {
              createPassValidationReviewerDirective:
                input.createPassValidationReviewerDirective
            }
          : {}),
        ...(input.resolvePassValidationArtifactPath !== undefined
          ? {
              resolvePassValidationArtifactPath:
                input.resolvePassValidationArtifactPath
            }
          : {}),
        ...(input.resolvePassValidationReviewerCompatibilityArtifactPath !== undefined
          ? {
              resolvePassValidationReviewerCompatibilityArtifactPath:
                input.resolvePassValidationReviewerCompatibilityArtifactPath
            }
          : {}),
        ...(input.isPassValidationRunnerExecutionError !== undefined
          ? {
              isPassValidationRunnerExecutionError:
                input.isPassValidationRunnerExecutionError
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
          buildPostAppendReviewVerificationWriter(input),
        writePostAppendPassState: input.writePostAppendPassState,
        updateReviewerDocGateArtifact: input.updateReviewerDocGateArtifact
      }),
    executeNormalPassDelivery: (deliveryInput) =>
      input.executeNormalPassDelivery(deliveryInput, {
        resolveReviewerTestDirectiveForPass: input.resolveReviewerTestDirectiveForPass,
        executePassDelivery: input.executePassDelivery,
        ...(emitDeliveryNotificationAck !== undefined
          ? { emitDeliveryNotificationAck }
          : {}),
        ...(input.refreshReviewerContext !== undefined
          ? { refreshReviewerContext: input.refreshReviewerContext }
          : {}),
        ...(input.readReviewerBriefArtifact !== undefined
          ? { readReviewerBriefArtifact: input.readReviewerBriefArtifact }
          : {}),
        ...(input.readReviewerFocusArtifact !== undefined
          ? { readReviewerFocusArtifact: input.readReviewerFocusArtifact }
          : {}),
        ...(input.resolveDeliveryMessageRef !== undefined
          ? { resolveDeliveryMessageRef: input.resolveDeliveryMessageRef }
          : {}),
        ...(input.verifyImplementerTestEvidence !== undefined
          ? {
              verifyImplementerTestEvidence:
                input.verifyImplementerTestEvidence
            }
          : {}),
        ...(input.writeReviewerTestEvidenceArtifact !== undefined
          ? {
              writeReviewerTestEvidenceArtifact:
                input.writeReviewerTestEvidenceArtifact
            }
          : {}),
        ...(input.resolveReviewerTestExecutionDirectiveFromArtifact !== undefined
          ? {
              resolveReviewerTestExecutionDirectiveFromArtifact:
                input.resolveReviewerTestExecutionDirectiveFromArtifact
            }
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
