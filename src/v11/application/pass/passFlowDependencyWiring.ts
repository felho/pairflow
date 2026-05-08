import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type { PassIntent } from "../../../contracts/kernel/protocol.js";
import { executeAutoConvergeConverged } from "./internal/autoConverge/autoConvergeConvergedExecution.js";
import { finalizeAutoConvergePass } from "./internal/autoConverge/autoConvergeFinalization.js";
import { prepareRepeatCleanAutoConverge } from "./internal/autoConverge/autoConvergePreparation.js";
import {
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace
} from "../converged/convergedCommandOrchestration.js";
import { executeNormalPassAppend } from "./internal/normalPass/normalPassAppendExecution.js";
import { prepareNormalPassAppend } from "./internal/normalPass/normalPassAppendPreparation.js";
import { executeNormalPassDelivery } from "./internal/normalPass/normalPassDeliveryExecution.js";
import { finalizeNormalPass } from "./internal/normalPass/normalPassFinalization.js";
import { persistNormalPassPostAppend } from "./internal/normalPass/normalPassPostAppendPersistence.js";
import { resolvePassIntent } from "./internal/normalPass/passIntentResolution.js";
import { mapPassResultDelivery } from "./internal/normalPass/passResultDelivery.js";
import { buildAutoConvergePassResult, buildNormalPassResult } from "./internal/normalPass/passResultBuilder.js";
import { resolvePassValidationForPass } from "./internal/verification/passValidationGate.js";
import { writePostAppendReviewVerificationArtifact } from "./internal/verification/postAppendReviewVerificationWriter.js";
import { writePostAppendPassState } from "./internal/normalPass/postAppendStateWriter.js";
import { prepareReviewerPass } from "./internal/reviewerDelivery/reviewerPassPreparation.js";
import { executePassDelivery, type PassDeliveryDependencies } from "./internal/reviewerDelivery/reviewerDelivery.js";
import { updateReviewerDocGateArtifact } from "./internal/reviewerDelivery/reviewerDocGateArtifactUpdater.js";
import { resolveReviewerTestDirectiveForPass } from "./internal/reviewerDelivery/reviewerTestDirectiveResolver.js";
import { resolveReviewerVerification } from "./internal/verification/reviewerVerificationResolver.js";
import { prepareReviewerVerification } from "./internal/verification/reviewerVerificationPreparation.js";
import { buildPassLifecycleMetricMetadata } from "../../domain/pass/lifecycleMetricMetadata.js";
import { resolveMostRecentPreviousReviewerPassIsCleanFromMetadata } from "../../domain/pass/repeatCleanMetadata.js";
import type { PreparePassRoutingDependencies } from "./internal/normalPass/passRoutingPreparation.js";
import { buildAutoConvergeFlowDependencies } from "./internal/autoConverge/autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowDependencies } from "./internal/normalPass/normalPassFlowInvocationBuilders.js";
import type { PassFlowRuntimeDependencies } from "./internal/normalPass/passFlowRuntimeDependenciesContract.js";

export type { PassFlowRuntimeDependencies } from "./internal/normalPass/passFlowRuntimeDependenciesContract.js";

let configuredPassFlowRuntimeDependencyDefaults:
  | PassFlowRuntimeDependencies
  | undefined;

const passFlowRuntimeDependencyDefaultsKey = Symbol.for(
  "pairflow.passFlowRuntimeDependencyDefaults"
);

function passFlowRuntimeDependencyDefaultStore(): typeof globalThis & {
  [passFlowRuntimeDependencyDefaultsKey]?: PassFlowRuntimeDependencies;
} {
  return globalThis as typeof globalThis & {
    [passFlowRuntimeDependencyDefaultsKey]?: PassFlowRuntimeDependencies;
  };
}

export function configurePassFlowRuntimeDependencyDefaults(
  defaults: PassFlowRuntimeDependencies
): void {
  configuredPassFlowRuntimeDependencyDefaults = defaults;
  passFlowRuntimeDependencyDefaultStore()[
    passFlowRuntimeDependencyDefaultsKey
  ] = defaults;
}

function resolveConfiguredPassFlowRuntimeDependencyDefaults():
  | PassFlowRuntimeDependencies
  | undefined {
  return (
    configuredPassFlowRuntimeDependencyDefaults
    ?? passFlowRuntimeDependencyDefaultStore()[
      passFlowRuntimeDependencyDefaultsKey
    ]
  );
}

function mergePassFlowRuntimeDependencyDefaults(
  runtimeDependencies: PassFlowRuntimeDependencies
): PassFlowRuntimeDependencies {
  const configuredDefaults =
    resolveConfiguredPassFlowRuntimeDependencyDefaults();
  if (configuredDefaults === undefined) {
    return runtimeDependencies;
  }

  const merged: PassFlowRuntimeDependencies = {
    ...configuredDefaults
  };
  for (const [key, value] of Object.entries(runtimeDependencies) as Array<
    [
      keyof PassFlowRuntimeDependencies,
      PassFlowRuntimeDependencies[keyof PassFlowRuntimeDependencies]
    ]
  >) {
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
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
): PreparePassRoutingDependencies {
  const configuredDefaults =
    resolveConfiguredPassFlowRuntimeDependencyDefaults();
  return {
    prepareReviewerPass,
    resolvePassIntent,
    prepareReviewerVerification,
    resolveReviewerVerification: (input) =>
      resolveReviewerVerification({
        ...input,
        ...(configuredDefaults?.resolveReviewVerificationInputFromRefs !== undefined
          ? {
              resolveInputFromRefs:
                configuredDefaults.resolveReviewVerificationInputFromRefs
            }
          : {})
      }),
    inferDefaultPassIntent
  };
}

export function createAutoConvergeFlowDependencies(
  runtimeDependencies: PassFlowRuntimeDependencies
) {
  const mergedRuntimeDependencies =
    mergePassFlowRuntimeDependencyDefaults(runtimeDependencies);
  const emitDeliveryNotificationAck =
    resolvePassFlowDeliveryOverride(mergedRuntimeDependencies);

  return buildAutoConvergeFlowDependencies({
    prepareRepeatCleanAutoConverge,
    executeAutoConvergeConverged,
    emitConvergedFromWorkspace,
    ...(emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck }
      : {}),
    ...(mergedRuntimeDependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: mergedRuntimeDependencies.emitBubbleNotification }
      : {}),
    finalizeAutoConvergePass,
    ...(mergedRuntimeDependencies.writeReviewVerificationArtifactAtomic !== undefined
      ? {
          writeReviewVerificationArtifactAtomic:
            mergedRuntimeDependencies.writeReviewVerificationArtifactAtomic
        }
      : {}),
    updateReviewerDocGateArtifact: (input) =>
      updateReviewerDocGateArtifactWithRuntimeDependencies(
        input,
        mergedRuntimeDependencies
      ),
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    buildAutoConvergePassResult
  });
}

export function createNormalPassFlowDependencies(
  runtimeDependencies: PassFlowRuntimeDependencies
) {
  const mergedRuntimeDependencies =
    mergePassFlowRuntimeDependencyDefaults(runtimeDependencies);
  const emitDeliveryNotificationAck =
    resolvePassFlowDeliveryOverride(mergedRuntimeDependencies);

  return buildNormalPassFlowDependencies({
    prepareNormalPassAppend,
    executeNormalPassAppend,
    resolvePassValidationForPass,
    resolvePassValidationPolicy:
      mergedRuntimeDependencies.resolvePassValidationPolicy,
    runPassValidationCommand: mergedRuntimeDependencies.runPassValidationCommand,
    buildPassValidationEvidenceArtifact:
      mergedRuntimeDependencies.buildPassValidationEvidenceArtifact,
    createPassValidationReviewerDirective:
      mergedRuntimeDependencies.createPassValidationReviewerDirective,
    resolvePassValidationArtifactPath:
      mergedRuntimeDependencies.resolvePassValidationArtifactPath,
    resolvePassValidationReviewerCompatibilityArtifactPath:
      mergedRuntimeDependencies.resolvePassValidationReviewerCompatibilityArtifactPath,
    isPassValidationRunnerExecutionError:
      mergedRuntimeDependencies.isPassValidationRunnerExecutionError,
    writePassValidationEvidenceArtifact:
      mergedRuntimeDependencies.writePassValidationEvidenceArtifact,
    writePassValidationReviewerCompatibilityArtifact:
      mergedRuntimeDependencies.writePassValidationReviewerCompatibilityArtifact,
    persistNormalPassPostAppend,
    writePostAppendReviewVerificationArtifact,
    writePostAppendPassState,
    updateReviewerDocGateArtifact: (input) =>
      updateReviewerDocGateArtifactWithRuntimeDependencies(
        input,
        mergedRuntimeDependencies
      ),
    executeNormalPassDelivery,
    resolveReviewerTestDirectiveForPass,
    executePassDelivery,
    ...(emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck }
      : {}),
    ...(mergedRuntimeDependencies.refreshReviewerContext !== undefined
      ? { refreshReviewerContext: mergedRuntimeDependencies.refreshReviewerContext }
      : {}),
    ...(mergedRuntimeDependencies.readReviewerBriefArtifact !== undefined
      ? {
          readReviewerBriefArtifact:
            mergedRuntimeDependencies.readReviewerBriefArtifact
        }
      : {}),
    ...(mergedRuntimeDependencies.readReviewerFocusArtifact !== undefined
      ? {
          readReviewerFocusArtifact:
            mergedRuntimeDependencies.readReviewerFocusArtifact
        }
      : {}),
    ...(mergedRuntimeDependencies.resolveDeliveryMessageRef !== undefined
      ? {
          resolveDeliveryMessageRef:
            mergedRuntimeDependencies.resolveDeliveryMessageRef
        }
      : {}),
    ...(mergedRuntimeDependencies.verifyImplementerTestEvidence !== undefined
      ? {
          verifyImplementerTestEvidence:
            mergedRuntimeDependencies.verifyImplementerTestEvidence
        }
      : {}),
    ...(mergedRuntimeDependencies.writeReviewerTestEvidenceArtifact !== undefined
      ? {
          writeReviewerTestEvidenceArtifact:
            mergedRuntimeDependencies.writeReviewerTestEvidenceArtifact
        }
      : {}),
    ...(mergedRuntimeDependencies.resolveReviewerTestExecutionDirectiveFromArtifact !== undefined
      ? {
          resolveReviewerTestExecutionDirectiveFromArtifact:
            mergedRuntimeDependencies.resolveReviewerTestExecutionDirectiveFromArtifact
        }
      : {}),
    ...(mergedRuntimeDependencies.writeReviewVerificationArtifactAtomic !== undefined
      ? {
          writeReviewVerificationArtifactAtomic:
            mergedRuntimeDependencies.writeReviewVerificationArtifactAtomic
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
