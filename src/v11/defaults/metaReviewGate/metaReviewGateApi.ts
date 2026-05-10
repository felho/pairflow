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
} from "../../shared/metaReviewGate/index.js";
import {
  type MetaReviewGateNotifyTmuxCapabilities,
  type MetaReviewGatePaneBindingTmuxCapabilities
} from "../../shared/metaReviewGate/index.js";
import {
  resolveMetaReviewGateNotifyTmuxCapabilities,
  resolveMetaReviewGatePaneBindingTmuxCapabilities
} from "../../application/metaReviewGate/metaReviewGateRuntimeCapabilityResolution.js";
import {
  applyMetaReviewGateOnConvergence as applyMetaReviewGateOnConvergenceBase,
  asMetaReviewGateError,
  MetaReviewGateError,
  toMetaReviewGateError
} from "../../application/metaReviewGate/metaReviewGateCommandApi.js";
import {
  notifyMetaReviewerSubmissionRequest as notifyMetaReviewerSubmissionRequestImpl
} from "../../application/metaReviewGate/metaReviewGateNotify.js";
import {
  resolveMetaReviewerPaneWarning
} from "../../application/metaReviewGate/metaReviewGatePaneBinding.js";
import {
  metaReviewGateDependencyDefaults,
  type MetaReviewGateDependencyDefaults
} from "./metaReviewGateCommandDefaults.js";

export {
  asMetaReviewGateError,
  MetaReviewGateError,
  toMetaReviewGateError
};
export type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateReasonCode,
  MetaReviewGateResult,
  MetaReviewGateRoute,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput
} from "../../shared/metaReviewGate/index.js";

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

function canonicalizeMetaReviewGateNotifyRuntime(
  runtime: MetaReviewGateNotifyRuntimeCapabilities | undefined
): MetaReviewGateNotifyRuntimeCapabilities {
  const tmux = resolveMetaReviewGateNotifyTmuxCapabilities(runtime);
  return tmux === undefined ? {} : { tmux };
}

function canonicalizeMetaReviewGatePaneBindingRuntime(
  runtime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined
): MetaReviewGatePaneBindingRuntimeCapabilities {
  const tmux = resolveMetaReviewGatePaneBindingTmuxCapabilities(runtime);
  return {
    ...(runtime?.buildAgentCommand !== undefined
      ? { buildAgentCommand: runtime.buildAgentCommand }
      : {}),
    ...(tmux !== undefined ? { tmux } : {})
  };
}

function mergeNotifyTmuxCapabilities(
  override: MetaReviewGateNotifyTmuxCapabilities | undefined,
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"]["tmux"]
): MetaReviewGateNotifyTmuxCapabilities {
  return mergeCapabilityLayer(override, defaults);
}

function mergeMetaReviewGateNotifyRuntime(
  runtime: MetaReviewGateNotifyRuntimeCapabilities | undefined,
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"]
): MetaReviewGateNotifyRuntimeCapabilities {
  return {
    tmux: mergeNotifyTmuxCapabilities(
      canonicalizeMetaReviewGateNotifyRuntime(runtime).tmux,
      defaults.tmux
    )
  };
}

function mergePaneBindingTmuxCapabilities(
  override: MetaReviewGatePaneBindingTmuxCapabilities | undefined,
  defaults: MetaReviewGateDependencyDefaults["runtime"]["paneBinding"]["tmux"]
): MetaReviewGatePaneBindingTmuxCapabilities {
  return mergeCapabilityLayer(override, defaults);
}

function mergeMetaReviewGatePaneBindingRuntime(
  runtime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined,
  defaults: MetaReviewGateDependencyDefaults["runtime"]["paneBinding"]
): MetaReviewGatePaneBindingRuntimeCapabilities {
  const normalized = canonicalizeMetaReviewGatePaneBindingRuntime(runtime);
  return {
    buildAgentCommand: normalized.buildAgentCommand ?? defaults.buildAgentCommand,
    tmux: mergePaneBindingTmuxCapabilities(normalized.tmux, defaults.tmux)
  };
}

function mergeNotifyRuntimeLayers(input: {
  callerRuntime: MetaReviewGateNotifyRuntimeCapabilities | undefined;
  wrapperRuntime: MetaReviewGateNotifyRuntimeCapabilities | undefined;
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"];
}): MetaReviewGateNotifyRuntimeCapabilities {
  const callerRuntime = canonicalizeMetaReviewGateNotifyRuntime(
    input.callerRuntime
  );
  const wrapperRuntime = canonicalizeMetaReviewGateNotifyRuntime(
    input.wrapperRuntime
  );
  return mergeMetaReviewGateNotifyRuntime(
    {
      ...(callerRuntime.tmux !== undefined || wrapperRuntime.tmux !== undefined
        ? {
            tmux: mergeCapabilityLayer(
              callerRuntime.tmux,
              wrapperRuntime.tmux ?? {}
            )
          }
        : {})
    },
    input.defaults
  );
}

function mergePaneBindingRuntimeLayers(input: {
  callerRuntime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined;
  wrapperRuntime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined;
  defaults: MetaReviewGateDependencyDefaults["runtime"]["paneBinding"];
}): MetaReviewGatePaneBindingRuntimeCapabilities {
  const callerRuntime = canonicalizeMetaReviewGatePaneBindingRuntime(
    input.callerRuntime
  );
  const wrapperRuntime = canonicalizeMetaReviewGatePaneBindingRuntime(
    input.wrapperRuntime
  );
  return mergeMetaReviewGatePaneBindingRuntime(
    {
      ...(
        callerRuntime.buildAgentCommand !== undefined ||
        wrapperRuntime.buildAgentCommand !== undefined
          ? {
              buildAgentCommand:
                callerRuntime.buildAgentCommand
                ?? wrapperRuntime.buildAgentCommand
            }
          : {}
      ),
      ...(callerRuntime.tmux !== undefined || wrapperRuntime.tmux !== undefined
        ? {
            tmux: mergeCapabilityLayer(
              callerRuntime.tmux,
              wrapperRuntime.tmux ?? {}
            )
          }
        : {})
    },
    input.defaults
  );
}

function resolvePaneBindingWrapperNotifyRuntime(input: {
  inputRuntime: MetaReviewGateRuntimeCapabilities | undefined;
  defaults: MetaReviewGateDependencyDefaults["runtime"]["notify"];
  preserveCallerNotifyRuntime: boolean;
}): MetaReviewGateNotifyRuntimeCapabilities | undefined {
  if (input.preserveCallerNotifyRuntime) {
    const notify = canonicalizeMetaReviewGateNotifyRuntime(input.inputRuntime?.notify);
    return notify.tmux === undefined ? undefined : notify;
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

  return {
    runtime: {
      ...(input.dependencies.runtime.notify !== undefined
        ? {
            notify: canonicalizeMetaReviewGateNotifyRuntime(
              input.dependencies.runtime.notify
            )
          }
        : {}),
      ...(input.dependencies.runtime.paneBinding !== undefined
        ? {
            paneBinding: canonicalizeMetaReviewGatePaneBindingRuntime(
              input.dependencies.runtime.paneBinding
            )
          }
        : {})
    }
  };
}

function withMetaReviewGateNotifyDefaults(
  notify: NotifyMetaReviewerSubmissionRequest = notifyMetaReviewerSubmissionRequestImpl,
  runtime?: MetaReviewGateNotifyRuntimeCapabilities
): NotifyMetaReviewerSubmissionRequest {
  return (
    input,
    dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
  ) =>
    notify(input, {
      runtime: mergeNotifyRuntimeLayers({
        callerRuntime: dependencies.runtime,
        wrapperRuntime: runtime,
        defaults: metaReviewGateDependencyDefaults.runtime.notify
      })
    });
}

function withMetaReviewGatePaneBindingDefaults(
  resolveWarning: ResolveMetaReviewerPaneWarning = resolveMetaReviewerPaneWarning,
  runtime?: MetaReviewGatePaneBindingRuntimeCapabilities,
  preserveNotifyRuntime: boolean = false
): ResolveMetaReviewerPaneWarning {
  return (input) =>
    resolveWarning({
      ...input,
      runtime: buildPaneBindingWrapperRuntime({
        defaults: metaReviewGateDependencyDefaults.runtime,
        inputRuntime: input.runtime,
        paneBindingRuntime: runtime,
        preserveCallerNotifyRuntime: preserveNotifyRuntime
      })
    });
}

function withMetaReviewGateApplyDefaults(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): ApplyMetaReviewGateOnConvergenceDependencies {
  const preserveNotifyRuntimeForResolveOverride =
    dependencies.notifyMetaReviewerSubmissionRequest !== undefined &&
    dependencies.runtime?.notify !== undefined;

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
    ...buildApplyRuntimeForwarding({
      dependencies
    }),
    notifyMetaReviewerSubmissionRequest:
      dependencies.notifyMetaReviewerSubmissionRequest
      ?? withMetaReviewGateNotifyDefaults(
        undefined,
        dependencies.runtime?.notify
      ),
    resolveMetaReviewerPaneWarning:
      withMetaReviewGatePaneBindingDefaults(
        dependencies.resolveMetaReviewerPaneWarning,
        dependencies.runtime?.paneBinding,
        preserveNotifyRuntimeForResolveOverride
      )
  };
}

export async function notifyMetaReviewerSubmissionRequest(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<MetaReviewRuntimeDeliveryObservation> {
  return withMetaReviewGateNotifyDefaults()(input, dependencies);
}

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  return applyMetaReviewGateOnConvergenceBase(
    input,
    withMetaReviewGateApplyDefaults(dependencies)
  );
}
