import {
  applyMetaReviewGateOnConvergence,
  asMetaReviewGateError,
  MetaReviewGateError,
  toMetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateResult
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  NotifyMetaReviewerSubmissionRequest,
  NotifyMetaReviewerSubmissionRequestInput,
  NotifyMetaReviewerSubmissionRequestDependencies,
  MetaReviewRuntimeDeliveryObservation,
  ResolveMetaReviewerPaneWarning
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";
import { resolveMetaReviewGateDependencyDefaults } from "./metaReviewGateDependencyDefaults.js";

let metaReviewGateDependencyDefaultsPromise:
  | Promise<Awaited<ReturnType<typeof resolveMetaReviewGateDependencyDefaults>>>
  | undefined;

async function loadMetaReviewGateDependencyDefaults() {
  metaReviewGateDependencyDefaultsPromise ??=
    resolveMetaReviewGateDependencyDefaults();
  return metaReviewGateDependencyDefaultsPromise;
}

function withMetaReviewGateNotifyDefaults(
  notify: NotifyMetaReviewerSubmissionRequest = notifyMetaReviewerSubmissionRequest
): Promise<NotifyMetaReviewerSubmissionRequest> {
  return loadMetaReviewGateDependencyDefaults().then((defaults) =>
    (
      input,
      dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
    ) =>
      notify(input, {
        runTmux: dependencies.runTmux ?? defaults.runTmux,
        maybeAcceptClaudeTrustPrompt:
          dependencies.maybeAcceptClaudeTrustPrompt
          ?? defaults.maybeAcceptClaudeTrustPrompt,
        sendAndSubmitTmuxPaneMessage:
          dependencies.sendAndSubmitTmuxPaneMessage
          ?? defaults.sendAndSubmitTmuxPaneMessage,
        submitTmuxPaneInput:
          dependencies.submitTmuxPaneInput
          ?? defaults.submitTmuxPaneInput
      })
  );
}

function withMetaReviewGatePaneBindingDefaults(
  resolveWarning: ResolveMetaReviewerPaneWarning = resolveMetaReviewerPaneWarning
): Promise<ResolveMetaReviewerPaneWarning> {
  return loadMetaReviewGateDependencyDefaults().then((defaults) =>
    (input) =>
      resolveWarning({
        ...input,
        buildAgentCommand:
          input.buildAgentCommand
          ?? defaults.buildAgentCommand,
        respawnTmuxPaneCommand:
          input.respawnTmuxPaneCommand
          ?? defaults.respawnTmuxPaneCommand
      })
  );
}

async function withMetaReviewGateApplyDefaults(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<ApplyMetaReviewGateOnConvergenceDependencies> {
  const defaults = await loadMetaReviewGateDependencyDefaults();
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope
      ?? defaults.appendProtocolEnvelope,
    readStateSnapshot:
      dependencies.readStateSnapshot
      ?? defaults.readStateSnapshot,
    readTranscriptEnvelopes:
      dependencies.readTranscriptEnvelopes
      ?? defaults.readTranscriptEnvelopes,
    resolveBubbleById:
      dependencies.resolveBubbleById
      ?? defaults.resolveBubbleById,
    setMetaReviewerPaneBinding:
      dependencies.setMetaReviewerPaneBinding
      ?? defaults.setMetaReviewerPaneBinding,
    writeStateSnapshot:
      dependencies.writeStateSnapshot
      ?? defaults.writeStateSnapshot,
    readFile: dependencies.readFile ?? defaults.readFile,
    runTmux: dependencies.runTmux ?? defaults.runTmux,
    notifyMetaReviewerSubmissionRequest:
      dependencies.notifyMetaReviewerSubmissionRequest
      ?? (await withMetaReviewGateNotifyDefaults()),
    resolveMetaReviewerPaneWarning:
      dependencies.resolveMetaReviewerPaneWarning
      ?? (await withMetaReviewGatePaneBindingDefaults())
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
  return (await withMetaReviewGateNotifyDefaults())(input, dependencies);
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
