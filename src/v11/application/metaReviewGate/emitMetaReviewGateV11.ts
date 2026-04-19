import {
  applyMetaReviewGateOnConvergence,
  asMetaReviewGateError,
  MetaReviewGateError,
  toMetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewRuntimeDeliveryObservation,
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities,
  MetaReviewGateRuntimeCapabilities,
  MetaReviewGateResult,
  NotifyMetaReviewerSubmissionRequest,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput,
  ResolveMetaReviewerPaneWarning
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  MetaReviewGateDependencyDefaults
} from "../../defaults/metaReviewGate/metaReviewGateCommandDefaults.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";
import { resolveMetaReviewGateDependencyDefaults } from "./metaReviewGateDependencyDefaults.js";

let metaReviewGateDependencyDefaultsPromise:
  | Promise<MetaReviewGateDependencyDefaults>
  | undefined;

async function loadMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  metaReviewGateDependencyDefaultsPromise ??=
    resolveMetaReviewGateDependencyDefaults();
  return metaReviewGateDependencyDefaultsPromise;
}

function mergeCapabilityLayer<T extends object>(
  override: Partial<T> | undefined,
  defaults: T
): T {
  const merged = {
    ...defaults
  };
  if (override === undefined) {
    return merged;
  }

  for (const [key, value] of Object.entries(override) as Array<
    [keyof T, T[keyof T] | undefined]
  >) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function mergeMetaReviewGateNotifyRuntime(
  runtime: MetaReviewGateNotifyRuntimeCapabilities | undefined,
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"]
): MetaReviewGateNotifyRuntimeCapabilities {
  return mergeCapabilityLayer(runtime, defaults);
}

function mergeMetaReviewGatePaneBindingRuntime(
  runtime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined,
  defaults: MetaReviewGateDependencyDefaults["runtime"]["paneBinding"]
): MetaReviewGatePaneBindingRuntimeCapabilities {
  return mergeCapabilityLayer(runtime, defaults);
}

function mergeNotifyRuntimeLayers(input: {
  callerRuntime: MetaReviewGateNotifyRuntimeCapabilities | undefined;
  wrapperRuntime: MetaReviewGateNotifyRuntimeCapabilities | undefined;
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"];
}): MetaReviewGateNotifyRuntimeCapabilities {
  return mergeMetaReviewGateNotifyRuntime(
    mergeCapabilityLayer(input.callerRuntime, input.wrapperRuntime ?? {}),
    input.defaults
  );
}

function mergePaneBindingRuntimeLayers(input: {
  callerRuntime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined;
  wrapperRuntime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined;
  defaults: MetaReviewGateDependencyDefaults["runtime"]["paneBinding"];
}): MetaReviewGatePaneBindingRuntimeCapabilities {
  return mergeMetaReviewGatePaneBindingRuntime(
    mergeCapabilityLayer(input.callerRuntime, input.wrapperRuntime ?? {}),
    input.defaults
  );
}

function resolvePaneBindingWrapperNotifyRuntime(input: {
  inputRuntime: MetaReviewGateRuntimeCapabilities | undefined;
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"];
  preserveCallerNotifyRuntime: boolean;
}): MetaReviewGateNotifyRuntimeCapabilities | undefined {
  if (input.preserveCallerNotifyRuntime) {
    return input.inputRuntime?.notify;
  }

  return mergeMetaReviewGateNotifyRuntime(
    input.inputRuntime?.notify,
    input.defaults
  );
}

function buildPaneBindingWrapperRuntime(input: {
  defaults: MetaReviewGateDependencyDefaults["runtime"];
  inputRuntime: MetaReviewGateRuntimeCapabilities | undefined;
  paneBindingRuntime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined;
  preserveCallerNotifyRuntime: boolean;
}): MetaReviewGateRuntimeCapabilities {
  const notify = resolvePaneBindingWrapperNotifyRuntime({
    inputRuntime: input.inputRuntime,
    defaults: input.defaults.notify,
    preserveCallerNotifyRuntime: input.preserveCallerNotifyRuntime
  });

  return {
    ...(notify !== undefined ? { notify } : {}),
    paneBinding: mergePaneBindingRuntimeLayers({
      callerRuntime: input.inputRuntime?.paneBinding,
      wrapperRuntime: input.paneBindingRuntime,
      defaults: input.defaults.paneBinding
    })
  };
}

function buildApplyRuntimeForwarding(input: {
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies;
}):
  | Pick<ApplyMetaReviewGateOnConvergenceDependencies, "runtime">
  | Record<never, never> {
  if (input.dependencies.runtime === undefined) {
    return {};
  }

  // Keep the original runtime object visible to explicit seam overrides.
  // Built-in wrappers resolve nested defaults separately so custom hooks can
  // still observe intentionally incomplete runtime input.
  return {
    runtime: input.dependencies.runtime
  };
}

function withMetaReviewGateNotifyDefaults(
  notify: NotifyMetaReviewerSubmissionRequest = notifyMetaReviewerSubmissionRequest,
  runtime?: MetaReviewGateNotifyRuntimeCapabilities
): Promise<NotifyMetaReviewerSubmissionRequest> {
  return loadMetaReviewGateDependencyDefaults().then((defaults) =>
    (
      input,
      dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
    ) =>
      notify(input, {
        runtime: mergeNotifyRuntimeLayers({
          callerRuntime: dependencies.runtime,
          wrapperRuntime: runtime,
          defaults: defaults.runtime.notify
        })
      })
  );
}

function withMetaReviewGatePaneBindingDefaults(
  resolveWarning: ResolveMetaReviewerPaneWarning = resolveMetaReviewerPaneWarning,
  runtime?: MetaReviewGatePaneBindingRuntimeCapabilities,
  preserveNotifyRuntime: boolean = false
): Promise<ResolveMetaReviewerPaneWarning> {
  return loadMetaReviewGateDependencyDefaults().then((defaults) =>
    (input) =>
      resolveWarning({
        ...input,
        runtime: buildPaneBindingWrapperRuntime({
          defaults: defaults.runtime,
          inputRuntime: input.runtime,
          paneBindingRuntime: runtime,
          preserveCallerNotifyRuntime: preserveNotifyRuntime
        })
      })
  );
}

async function withMetaReviewGateApplyDefaults(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<ApplyMetaReviewGateOnConvergenceDependencies> {
  const defaults = await loadMetaReviewGateDependencyDefaults();
  const preserveNotifyRuntimeForResolveOverride =
    dependencies.notifyMetaReviewerSubmissionRequest !== undefined &&
    dependencies.runtime?.notify !== undefined;

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
    ...buildApplyRuntimeForwarding({
      dependencies
    }),
    notifyMetaReviewerSubmissionRequest:
      dependencies.notifyMetaReviewerSubmissionRequest
      ?? await withMetaReviewGateNotifyDefaults(
        undefined,
        dependencies.runtime?.notify
      ),
    resolveMetaReviewerPaneWarning:
      await withMetaReviewGatePaneBindingDefaults(
        dependencies.resolveMetaReviewerPaneWarning,
        dependencies.runtime?.paneBinding,
        preserveNotifyRuntimeForResolveOverride
      )
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
