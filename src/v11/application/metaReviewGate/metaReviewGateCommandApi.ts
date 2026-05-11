import {
  applyMetaReviewGateOnConvergence as applyMetaReviewGateOnConvergenceInternal
} from "./internal/apply/metaReviewGateApply.js";
import {
  asMetaReviewGateError,
  toMetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateErrorConversion.js";
import {
  MetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  ApplyMetaReviewGateOnConvergencePort
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  MetaReviewGateResult
} from "../../shared/metaReviewGate/metaReviewGateResultContract.js";

export { MetaReviewGateError };

export const applyMetaReviewGateOnConvergence: ApplyMetaReviewGateOnConvergencePort = async (
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> => {
  return applyMetaReviewGateOnConvergenceInternal(input, dependencies);
};
export { asMetaReviewGateError, toMetaReviewGateError };
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
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
