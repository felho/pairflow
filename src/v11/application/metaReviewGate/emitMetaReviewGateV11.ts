import {
  applyMetaReviewGateOnConvergence,
  asMetaReviewGateError,
  MetaReviewGateError,
  toMetaReviewGateError
} from "./metaReviewGateCommandApi.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewRuntimeDeliveryObservation,
  MetaReviewGateResult,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput
} from "./metaReviewGateCommandApi.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";
import { resolveMetaReviewGateDependencyDefaults } from "./metaReviewGateDependencyDefaults.js";

async function withMetaReviewGateApplyDefaults(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<ApplyMetaReviewGateOnConvergenceDependencies> {
  const defaults = await resolveMetaReviewGateDependencyDefaults();
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope ?? defaults.appendProtocolEnvelope,
    readStateSnapshot:
      dependencies.readStateSnapshot ?? defaults.readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes ?? defaults.readTranscriptEnvelopes,
    resolveBubbleById:
      dependencies.resolveBubbleById ?? defaults.resolveBubbleById,
    setMetaReviewerPaneBinding:
      dependencies.setMetaReviewerPaneBinding
      ?? defaults.setMetaReviewerPaneBinding,
    writeStateSnapshot:
      dependencies.writeStateSnapshot ?? defaults.writeStateSnapshot,
    readFile: dependencies.readFile ?? defaults.readFile,
    runtime: dependencies.runtime ?? defaults.runtime,
    notifyMetaReviewerSubmissionRequest:
      dependencies.notifyMetaReviewerSubmissionRequest
      ?? notifyMetaReviewerSubmissionRequestV11,
    resolveMetaReviewerPaneWarning:
      dependencies.resolveMetaReviewerPaneWarning
      ?? resolveMetaReviewerPaneWarning
  };
}

export {
  asMetaReviewGateError as asMetaReviewGateErrorV11,
  MetaReviewGateError as MetaReviewGateErrorV11,
  toMetaReviewGateError as toMetaReviewGateErrorV11
};

export async function notifyMetaReviewerSubmissionRequestV11(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<MetaReviewRuntimeDeliveryObservation> {
  const defaults = await resolveMetaReviewGateDependencyDefaults();
  return notifyMetaReviewerSubmissionRequest(input, {
    runtime: dependencies.runtime ?? defaults.runtime.notify
  });
}
export type {
  ApplyMetaReviewGateOnConvergenceDependencies as ApplyMetaReviewGateOnConvergenceV11Dependencies,
  ApplyMetaReviewGateOnConvergenceInput as ApplyMetaReviewGateOnConvergenceV11Input,
  MetaReviewGateReasonCode as MetaReviewGateReasonCodeV11,
  MetaReviewGateResult as MetaReviewGateResultV11,
  MetaReviewGateRoute as MetaReviewGateRouteV11,
  NotifyMetaReviewerSubmissionRequestDependencies as NotifyMetaReviewerSubmissionRequestV11Dependencies,
  NotifyMetaReviewerSubmissionRequestInput as NotifyMetaReviewerSubmissionRequestV11Input
} from "./metaReviewGateCommandContract.js";

export async function applyMetaReviewGateOnConvergenceV11(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  return applyMetaReviewGateOnConvergence(
    input,
    await withMetaReviewGateApplyDefaults(dependencies)
  );
}
