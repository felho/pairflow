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
import { passValidationDefaults } from "./passValidationDependencyDefaults.js";
import { buildAutoConvergeFlowDependencies } from "./autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowDependencies } from "./normalPassFlowInvocationBuilders.js";

export interface PassFlowRuntimeDependencies extends PassDeliveryDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}

const updateReviewerDocGateArtifactWithDefaults = (
  input: Parameters<typeof updateReviewerDocGateArtifact>[0]
) =>
    updateReviewerDocGateArtifact(input, {
      readDocContractGateArtifact:
        passValidationDefaults.readDocContractGateArtifact,
      resolveDocContractGateArtifactPath:
        passValidationDefaults.resolveDocContractGateArtifactPath,
      writeDocContractGateArtifact:
        passValidationDefaults.writeDocContractGateArtifact
    });

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
    updateReviewerDocGateArtifact: updateReviewerDocGateArtifactWithDefaults,
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
      passValidationDefaults.resolvePassValidationPolicy,
    runPassValidationCommand: passValidationDefaults.runPassValidationCommand,
    buildPassValidationEvidenceArtifact:
      passValidationDefaults.buildPassValidationEvidenceArtifact,
    writePassValidationEvidenceArtifact:
      passValidationDefaults.writePassValidationEvidenceArtifact,
    writePassValidationReviewerCompatibilityArtifact:
      passValidationDefaults.writePassValidationReviewerCompatibilityArtifact,
    persistNormalPassPostAppend,
    writePostAppendReviewVerificationArtifact,
    writePostAppendPassState,
    updateReviewerDocGateArtifact: updateReviewerDocGateArtifactWithDefaults,
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
    finalizeNormalPass,
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    resolveMostRecentPreviousReviewerPassIsCleanFromMetadata,
    mapPassResultDelivery,
    buildNormalPassResult
  });
}
