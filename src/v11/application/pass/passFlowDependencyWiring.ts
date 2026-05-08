import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";
import { executeAutoConvergeConverged } from "./autoConvergeConvergedExecution.js";
import { finalizeAutoConvergePass } from "./autoConvergeFinalization.js";
import { prepareRepeatCleanAutoConverge } from "./autoConvergePreparation.js";
import {
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
import type { PassFlowRuntimeDependencies } from "./passFlowRuntimeDependenciesContract.js";

export type { PassFlowRuntimeDependencies } from "./passFlowRuntimeDependenciesContract.js";

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
) {
  const configuredDefaults =
    resolveConfiguredPassFlowRuntimeDependencyDefaults();
  return buildPassRoutingDependencies({
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
  });
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
