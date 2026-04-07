import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
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
import {
  buildPassValidationEvidenceArtifact,
  resolvePassValidationPolicy,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} from "../../../core/runtime/passValidationEvidence.js";
import { runPassValidationCommand } from "../../../core/runtime/passValidationRunner.js";
import { buildAutoConvergeFlowDependencies } from "./autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowDependencies } from "./normalPassFlowInvocationBuilders.js";

export interface PassFlowRuntimeDependencies extends PassDeliveryDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
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
  return buildAutoConvergeFlowDependencies({
    prepareRepeatCleanAutoConverge,
    executeAutoConvergeConverged,
    emitConvergedFromWorkspace,
    ...(runtimeDependencies.emitTmuxDeliveryNotification !== undefined
      ? {
          emitTmuxDeliveryNotification:
            runtimeDependencies.emitTmuxDeliveryNotification
        }
      : {}),
    ...(runtimeDependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: runtimeDependencies.emitBubbleNotification }
      : {}),
    finalizeAutoConvergePass,
    updateReviewerDocGateArtifact,
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    buildAutoConvergePassResult
  });
}

export function createNormalPassFlowDependencies(
  runtimeDependencies: PassFlowRuntimeDependencies
) {
  return buildNormalPassFlowDependencies({
    prepareNormalPassAppend,
    executeNormalPassAppend,
    resolvePassValidationForPass,
    resolvePassValidationPolicy,
    runPassValidationCommand,
    buildPassValidationEvidenceArtifact,
    writePassValidationEvidenceArtifact,
    writePassValidationReviewerCompatibilityArtifact,
    persistNormalPassPostAppend,
    writePostAppendReviewVerificationArtifact,
    writePostAppendPassState,
    updateReviewerDocGateArtifact,
    executeNormalPassDelivery,
    resolveReviewerTestDirectiveForPass,
    executePassDelivery,
    ...(runtimeDependencies.emitTmuxDeliveryNotification !== undefined
      ? {
          emitTmuxDeliveryNotification:
            runtimeDependencies.emitTmuxDeliveryNotification
        }
      : {}),
    ...(runtimeDependencies.refreshReviewerContext !== undefined
      ? { refreshReviewerContext: runtimeDependencies.refreshReviewerContext }
      : {}),
    finalizeNormalPass,
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    resolveMostRecentPreviousReviewerPassIsCleanFromMetadata,
    mapPassResultDelivery,
    buildNormalPassResult
  });
}
