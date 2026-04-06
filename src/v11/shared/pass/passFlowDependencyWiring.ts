import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";
import {
  type EmitConvergedV11Dependencies as EmitConvergedDependencies,
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace
} from "../../application/converged/emitConvergedV11.js";
import { executeAutoConvergeConverged } from "../../application/pass/autoConvergeConvergedExecution.js";
import { finalizeAutoConvergePass } from "../../application/pass/autoConvergeFinalization.js";
import { prepareRepeatCleanAutoConverge } from "../../application/pass/autoConvergePreparation.js";
import { executeNormalPassAppend } from "../../application/pass/normalPassAppendExecution.js";
import { prepareNormalPassAppend } from "../../application/pass/normalPassAppendPreparation.js";
import { executeNormalPassDelivery } from "../../application/pass/normalPassDeliveryExecution.js";
import { finalizeNormalPass } from "../../application/pass/normalPassFinalization.js";
import { persistNormalPassPostAppend } from "../../application/pass/normalPassPostAppendPersistence.js";
import { resolvePassValidationForPass } from "../../application/pass/passValidationGate.js";
import { mapPassResultDelivery } from "../../application/pass/passResultDelivery.js";
import { buildAutoConvergePassResult, buildNormalPassResult } from "../../application/pass/passResultBuilder.js";
import { writePostAppendReviewVerificationArtifact } from "../../application/pass/postAppendReviewVerificationWriter.js";
import { writePostAppendPassState } from "../../application/pass/postAppendStateWriter.js";
import { prepareReviewerPass } from "../../application/pass/reviewerPassPreparation.js";
import { executePassDelivery, type PassDeliveryDependencies } from "../../application/pass/reviewerDelivery.js";
import { updateReviewerDocGateArtifact } from "../../application/pass/reviewerDocGateArtifactUpdater.js";
import { resolveReviewerTestDirectiveForPass } from "../../application/pass/reviewerTestDirectiveResolver.js";
import { resolveReviewerVerification } from "../../application/pass/reviewerVerificationResolver.js";
import { prepareReviewerVerification } from "../../application/pass/reviewerVerificationPreparation.js";
import { resolvePassIntent } from "../../application/pass/passIntentResolution.js";
import { buildPassLifecycleMetricMetadata } from "../../domain/pass/lifecycleMetricMetadata.js";
import { resolveMostRecentPreviousReviewerPassIsCleanFromMetadata } from "../../domain/pass/repeatCleanMetadata.js";
import {
  buildPassValidationEvidenceArtifact,
  resolvePassValidationPolicy,
  writePassValidationEvidenceArtifact,
  writePassValidationReviewerCompatibilityArtifact
} from "../../infrastructure/artifact/validation/passValidationEvidence.js";
import { runPassValidationCommand } from "../../infrastructure/executor/validation/passValidationCommandRunner.js";
import { buildAutoConvergeFlowDependencies } from "./autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowDependencies } from "./normalPassFlowInvocationBuilders.js";
import { buildPassRoutingDependencies } from "./passRoutingInvocationBuilders.js";

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
