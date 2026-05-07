import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";
import { executeAutoConvergeConverged } from "./autoConvergeConvergedExecution.js";
import { finalizeAutoConvergePass } from "./autoConvergeFinalization.js";
import { prepareRepeatCleanAutoConverge } from "./autoConvergePreparation.js";
import {
  type EmitConvergedV11Dependencies as EmitConvergedDependencies,
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace
} from "../converged/emitConvergedV11.js";
import { executeNormalPassAppend } from "./normalPassAppendExecution.js";
import { prepareNormalPassAppend } from "./normalPassAppendPreparation.js";
import { executeNormalPassDelivery } from "./normalPassDeliveryExecution.js";
import { finalizeNormalPass } from "./normalPassFinalization.js";
import { persistNormalPassPostAppend } from "./normalPassPostAppendPersistence.js";
import { resolvePassIntent } from "./passIntentResolution.js";
import { mapPassResultDelivery } from "./passResultDelivery.js";
import { buildAutoConvergePassResult, buildNormalPassResult } from "./passResultBuilder.js";
import { resolvePassValidationForPass } from "./passValidationGate.js";
import { writePostAppendReviewVerificationArtifact } from "./postAppendReviewVerificationWriter.js";
import { writePostAppendPassState } from "./postAppendStateWriter.js";
import { prepareReviewerPass } from "./reviewerPassPreparation.js";
import { executePassDelivery, type PassDeliveryDependencies } from "./reviewerDelivery.js";
import { updateReviewerDocGateArtifact } from "./reviewerDocGateArtifactUpdater.js";
import { resolveReviewerTestDirectiveForPass } from "./reviewerTestDirectiveResolver.js";
import { resolveReviewerVerification } from "./reviewerVerificationResolver.js";
import { prepareReviewerVerification } from "./reviewerVerificationPreparation.js";
import { buildPassLifecycleMetricMetadata } from "../../domain/pass/lifecycleMetricMetadata.js";
import { resolveMostRecentPreviousReviewerPassIsCleanFromMetadata } from "../../domain/pass/repeatCleanMetadata.js";
import { buildPassRoutingDependencies } from "./passRoutingInvocationBuilders.js";
import { buildAutoConvergeFlowDependencies } from "./autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowDependencies } from "./normalPassFlowInvocationBuilders.js";
import type { ResolvePassValidationForPassDependencies } from "./passValidationGate.js";
import type { UpdateReviewerDocGateArtifactDependencies } from "./reviewerDocGateArtifactUpdater.js";
import type { WritePostAppendReviewVerificationArtifactDependencies } from "./postAppendReviewVerificationWriter.js";

export interface PassFlowRuntimeDependencies extends PassDeliveryDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
  readDocContractGateArtifact?:
    UpdateReviewerDocGateArtifactDependencies["readDocContractGateArtifact"];
  resolveDocContractGateArtifactPath?:
    UpdateReviewerDocGateArtifactDependencies["resolveDocContractGateArtifactPath"];
  writeDocContractGateArtifact?:
    UpdateReviewerDocGateArtifactDependencies["writeDocContractGateArtifact"];
  writeReviewVerificationArtifactAtomic?:
    WritePostAppendReviewVerificationArtifactDependencies["writeReviewVerificationArtifactAtomic"];
  resolveReviewVerificationInputFromRefs?:
    Parameters<typeof resolveReviewerVerification>[0]["resolveInputFromRefs"];
  resolvePassValidationPolicy?:
    ResolvePassValidationForPassDependencies["resolvePassValidationPolicy"];
  runPassValidationCommand?:
    ResolvePassValidationForPassDependencies["runPassValidationCommand"];
  buildPassValidationEvidenceArtifact?:
    ResolvePassValidationForPassDependencies["buildPassValidationEvidenceArtifact"];
  createPassValidationReviewerDirective?:
    ResolvePassValidationForPassDependencies["createPassValidationReviewerDirective"];
  resolvePassValidationArtifactPath?:
    ResolvePassValidationForPassDependencies["resolvePassValidationArtifactPath"];
  resolvePassValidationReviewerCompatibilityArtifactPath?:
    ResolvePassValidationForPassDependencies["resolvePassValidationReviewerCompatibilityArtifactPath"];
  isPassValidationRunnerExecutionError?:
    ResolvePassValidationForPassDependencies["isPassValidationRunnerExecutionError"];
  writePassValidationEvidenceArtifact?:
    ResolvePassValidationForPassDependencies["writePassValidationEvidenceArtifact"];
  writePassValidationReviewerCompatibilityArtifact?:
    ResolvePassValidationForPassDependencies["writePassValidationReviewerCompatibilityArtifact"];
}

function updateReviewerDocGateArtifactWithRuntimeDependencies(
  input: Parameters<typeof updateReviewerDocGateArtifact>[0],
  runtimeDependencies: PassFlowRuntimeDependencies
) {
  return (
    updateReviewerDocGateArtifact(input, {
      readDocContractGateArtifact:
        runtimeDependencies.readDocContractGateArtifact!,
      resolveDocContractGateArtifactPath:
        runtimeDependencies.resolveDocContractGateArtifactPath!,
      writeDocContractGateArtifact:
        runtimeDependencies.writeDocContractGateArtifact!
    })
  );
}

function resolvePassFlowDeliveryOverride(
  runtimeDependencies: PassFlowRuntimeDependencies
): PassDeliveryDependencies["emitDeliveryNotificationAck"] | undefined {
  return runtimeDependencies.emitDeliveryNotificationAck;
}

export function createPassRoutingDependencies(
  inferDefaultPassIntent: (activeRole: AgentRole) => PassIntent
) {
  return buildPassRoutingDependencies({
    prepareReviewerPass,
    resolvePassIntent,
    prepareReviewerVerification,
    resolveReviewerVerification,
    inferDefaultPassIntent
  });
}

export function createAutoConvergeFlowDependencies(
  runtimeDependencies: PassFlowRuntimeDependencies
) {
  const emitDeliveryNotificationAck =
    resolvePassFlowDeliveryOverride(runtimeDependencies);

  return buildAutoConvergeFlowDependencies({
    prepareRepeatCleanAutoConverge,
    executeAutoConvergeConverged,
    emitConvergedFromWorkspace,
    ...(emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck }
      : {}),
    ...(runtimeDependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: runtimeDependencies.emitBubbleNotification }
      : {}),
    finalizeAutoConvergePass,
    updateReviewerDocGateArtifact: (input) =>
      updateReviewerDocGateArtifactWithRuntimeDependencies(
        input,
        runtimeDependencies
      ),
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    buildAutoConvergePassResult
  });
}

export function createNormalPassFlowDependencies(
  runtimeDependencies: PassFlowRuntimeDependencies
) {
  const emitDeliveryNotificationAck =
    resolvePassFlowDeliveryOverride(runtimeDependencies);

  return buildNormalPassFlowDependencies({
    prepareNormalPassAppend,
    executeNormalPassAppend,
    resolvePassValidationForPass,
    resolvePassValidationPolicy:
      runtimeDependencies.resolvePassValidationPolicy,
    runPassValidationCommand: runtimeDependencies.runPassValidationCommand,
    buildPassValidationEvidenceArtifact:
      runtimeDependencies.buildPassValidationEvidenceArtifact,
    createPassValidationReviewerDirective:
      runtimeDependencies.createPassValidationReviewerDirective,
    resolvePassValidationArtifactPath:
      runtimeDependencies.resolvePassValidationArtifactPath,
    resolvePassValidationReviewerCompatibilityArtifactPath:
      runtimeDependencies.resolvePassValidationReviewerCompatibilityArtifactPath,
    isPassValidationRunnerExecutionError:
      runtimeDependencies.isPassValidationRunnerExecutionError,
    writePassValidationEvidenceArtifact:
      runtimeDependencies.writePassValidationEvidenceArtifact,
    writePassValidationReviewerCompatibilityArtifact:
      runtimeDependencies.writePassValidationReviewerCompatibilityArtifact,
    persistNormalPassPostAppend,
    writePostAppendReviewVerificationArtifact,
    writePostAppendPassState,
    updateReviewerDocGateArtifact: (input) =>
      updateReviewerDocGateArtifactWithRuntimeDependencies(
        input,
        runtimeDependencies
      ),
    executeNormalPassDelivery,
    resolveReviewerTestDirectiveForPass,
    executePassDelivery,
    ...(emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck }
      : {}),
    ...(runtimeDependencies.refreshReviewerContext !== undefined
      ? { refreshReviewerContext: runtimeDependencies.refreshReviewerContext }
      : {}),
    ...(runtimeDependencies.readReviewerBriefArtifact !== undefined
      ? {
          readReviewerBriefArtifact:
            runtimeDependencies.readReviewerBriefArtifact
        }
      : {}),
    ...(runtimeDependencies.readReviewerFocusArtifact !== undefined
      ? {
          readReviewerFocusArtifact:
            runtimeDependencies.readReviewerFocusArtifact
        }
      : {}),
    ...(runtimeDependencies.resolveDeliveryMessageRef !== undefined
      ? {
          resolveDeliveryMessageRef:
            runtimeDependencies.resolveDeliveryMessageRef
        }
      : {}),
    ...(runtimeDependencies.verifyImplementerTestEvidence !== undefined
      ? {
          verifyImplementerTestEvidence:
            runtimeDependencies.verifyImplementerTestEvidence
        }
      : {}),
    ...(runtimeDependencies.writeReviewerTestEvidenceArtifact !== undefined
      ? {
          writeReviewerTestEvidenceArtifact:
            runtimeDependencies.writeReviewerTestEvidenceArtifact
        }
      : {}),
    ...(runtimeDependencies.resolveReviewerTestExecutionDirectiveFromArtifact !== undefined
      ? {
          resolveReviewerTestExecutionDirectiveFromArtifact:
            runtimeDependencies.resolveReviewerTestExecutionDirectiveFromArtifact
        }
      : {}),
    ...(runtimeDependencies.writeReviewVerificationArtifactAtomic !== undefined
      ? {
          writeReviewVerificationArtifactAtomic:
            runtimeDependencies.writeReviewVerificationArtifactAtomic
        }
      : {}),
    finalizeNormalPass,
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    resolveMostRecentPreviousReviewerPassIsCleanFromMetadata,
    mapPassResultDelivery,
    buildNormalPassResult
  });
}
