import {
  applyMetaReviewGateOnConvergence as applyMetaReviewGateOnConvergenceInternal
} from "./internal/metaReviewGateApply.js";
import {
  asMetaReviewGateError as asMetaReviewGateErrorInternal,
  toMetaReviewGateError as toMetaReviewGateErrorInternal
} from "./internal/metaReviewGateErrorConversion.js";
import {
  MetaReviewGateError
} from "./metaReviewGateRouteContract.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  ApplyMetaReviewGateOnConvergencePort
} from "./metaReviewGateCommandContract.js";
import type {
  MetaReviewGateResult
} from "./metaReviewGateResultContract.js";

export { MetaReviewGateError };

export const applyMetaReviewGateOnConvergence: ApplyMetaReviewGateOnConvergencePort = async (
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> => {
  return applyMetaReviewGateOnConvergenceInternal(input, dependencies);
};

export function toMetaReviewGateError(error: unknown): MetaReviewGateError {
  return toMetaReviewGateErrorInternal(error);
}

export function asMetaReviewGateError(error: unknown): never {
  return asMetaReviewGateErrorInternal(error);
}
export type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  FinalizeCurrentRunMetaReviewGateInput,
  MetaReviewRuntimeDeliveryObservation,
  MetaReviewApproveValidationCommandRunInput,
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities,
  MetaReviewGateReasonCode,
  MetaReviewGateResult,
  MetaReviewGateRoute,
  MetaReviewGateRuntimeCapabilities,
  NotifyMetaReviewerSubmissionRequest,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput,
  ResolveMetaReviewerPaneWarning
} from "./metaReviewGateCommandContract.js";
