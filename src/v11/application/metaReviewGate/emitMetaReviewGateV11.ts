import { metaReviewGateDependencyDefaults } from "../../../core/bubble/metaReviewGateDefaults.js";

import {
  applyMetaReviewGateOnConvergence,
  asMetaReviewGateError,
  MetaReviewGateError,
  recoverMetaReviewGateFromSnapshot,
  toMetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateResult,
  NotifyMetaReviewerSubmissionRequest,
  NotifyMetaReviewerSubmissionRequestDependencies,
  RecoverMetaReviewGateFromSnapshotDependencies,
  RecoverMetaReviewGateFromSnapshotInput
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";
import { metaReviewGateRuntimeDependencyDefaults } from "./metaReviewGateRuntimeDependencyDefaults.js";

function withMetaReviewGateNotifyDefaults(
  notify: NotifyMetaReviewerSubmissionRequest = notifyMetaReviewerSubmissionRequest
): NotifyMetaReviewerSubmissionRequest {
  return (
    input,
    dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
  ) =>
    notify(input, {
      runTmux: dependencies.runTmux ?? metaReviewGateDependencyDefaults.runTmux,
      maybeAcceptClaudeTrustPrompt:
        dependencies.maybeAcceptClaudeTrustPrompt
        ?? metaReviewGateRuntimeDependencyDefaults.maybeAcceptClaudeTrustPrompt,
      sendAndSubmitTmuxPaneMessage:
        dependencies.sendAndSubmitTmuxPaneMessage
        ?? metaReviewGateRuntimeDependencyDefaults.sendAndSubmitTmuxPaneMessage,
      submitTmuxPaneInput:
        dependencies.submitTmuxPaneInput
        ?? metaReviewGateRuntimeDependencyDefaults.submitTmuxPaneInput
    });
}

function withMetaReviewGateApplyDefaults(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): ApplyMetaReviewGateOnConvergenceDependencies {
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope
      ?? metaReviewGateDependencyDefaults.appendProtocolEnvelope,
    readStateSnapshot:
      dependencies.readStateSnapshot
      ?? metaReviewGateDependencyDefaults.readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes
      ?? metaReviewGateDependencyDefaults.readTranscriptEnvelopes,
    resolveBubbleById:
      dependencies.resolveBubbleById
      ?? metaReviewGateDependencyDefaults.resolveBubbleById,
    setMetaReviewerPaneBinding:
      dependencies.setMetaReviewerPaneBinding
      ?? metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
    writeStateSnapshot:
      dependencies.writeStateSnapshot
      ?? metaReviewGateDependencyDefaults.writeStateSnapshot,
    readFile: dependencies.readFile ?? metaReviewGateDependencyDefaults.readFile,
    runTmux: dependencies.runTmux ?? metaReviewGateDependencyDefaults.runTmux,
    notifyMetaReviewerSubmissionRequest:
      dependencies.notifyMetaReviewerSubmissionRequest
      ?? withMetaReviewGateNotifyDefaults(),
    resolveMetaReviewerPaneWarning:
      dependencies.resolveMetaReviewerPaneWarning
      ?? resolveMetaReviewerPaneWarning
  };
}

function withMetaReviewGateRecoveryDefaults(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): RecoverMetaReviewGateFromSnapshotDependencies {
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope
      ?? metaReviewGateDependencyDefaults.appendProtocolEnvelope,
    readStateSnapshot:
      dependencies.readStateSnapshot
      ?? metaReviewGateDependencyDefaults.readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes
      ?? metaReviewGateDependencyDefaults.readTranscriptEnvelopes,
    resolveBubbleById:
      dependencies.resolveBubbleById
      ?? metaReviewGateDependencyDefaults.resolveBubbleById,
    setMetaReviewerPaneBinding:
      dependencies.setMetaReviewerPaneBinding
      ?? metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
    writeStateSnapshot:
      dependencies.writeStateSnapshot
      ?? metaReviewGateDependencyDefaults.writeStateSnapshot,
    readFile: dependencies.readFile ?? metaReviewGateDependencyDefaults.readFile,
    writeFile:
      dependencies.writeFile ?? metaReviewGateDependencyDefaults.writeFile,
    ...(dependencies.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: dependencies.sleepForRetryMs }
      : {})
  };
}

export {
  asMetaReviewGateError as asMetaReviewGateErrorV11,
  MetaReviewGateError as MetaReviewGateErrorV11,
  toMetaReviewGateError as toMetaReviewGateErrorV11
};
export {
  notifyMetaReviewerSubmissionRequest as notifyMetaReviewerSubmissionRequestV11
};
export type {
  ApplyMetaReviewGateOnConvergenceDependencies as ApplyMetaReviewGateOnConvergenceV11Dependencies,
  ApplyMetaReviewGateOnConvergenceInput as ApplyMetaReviewGateOnConvergenceV11Input,
  MetaReviewGateReasonCode as MetaReviewGateReasonCodeV11,
  MetaReviewGateResult as MetaReviewGateResultV11,
  MetaReviewGateRoute as MetaReviewGateRouteV11,
  NotifyMetaReviewerSubmissionRequestDependencies as NotifyMetaReviewerSubmissionRequestV11Dependencies,
  NotifyMetaReviewerSubmissionRequestInput as NotifyMetaReviewerSubmissionRequestV11Input,
  RecoverMetaReviewGateFromSnapshotDependencies as RecoverMetaReviewGateFromSnapshotV11Dependencies,
  RecoverMetaReviewGateFromSnapshotInput as RecoverMetaReviewGateFromSnapshotV11Input
} from "./metaReviewGateCommandContract.js";

export async function applyMetaReviewGateOnConvergenceV11(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  return applyMetaReviewGateOnConvergence(
    input,
    withMetaReviewGateApplyDefaults(dependencies)
  );
}

export async function recoverMetaReviewGateFromSnapshotV11(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  return recoverMetaReviewGateFromSnapshot(
    input,
    withMetaReviewGateRecoveryDefaults(dependencies)
  );
}
