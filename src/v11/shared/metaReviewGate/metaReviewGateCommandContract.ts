export type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewRuntimeDeliveryObservation,
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities,
  MetaReviewGateRuntimeCapabilities,
  NotifyMetaReviewerSubmissionRequest,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput,
  ResolveMetaReviewerPaneWarning
} from "./metaReviewGateRuntimeCapabilities.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput
} from "./metaReviewGateRuntimeCapabilities.js";
export type {
  MetaReviewGateReasonCode,
  MetaReviewGateRoute
} from "./metaReviewGateRouteContract.js";
export type { MetaReviewGateResult } from "./metaReviewGateResultContract.js";
import type { MetaReviewGateResult } from "./metaReviewGateResultContract.js";
export type {
  FinalizeCurrentRunMetaReviewGateInput,
  MetaReviewApproveValidationCommandRunInput
} from "./metaReviewGateCurrentRunTypes.js";

export type ApplyMetaReviewGateOnConvergencePort = (
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies?: ApplyMetaReviewGateOnConvergenceDependencies
) => Promise<MetaReviewGateResult>;
