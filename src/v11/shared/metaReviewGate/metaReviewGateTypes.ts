import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  MetaReviewResult
} from "../metaReview/metaReviewTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../../domain/metaReviewGate/gateRoutingTypes.js";
export {
  MetaReviewGateError,
  metaReviewGateRoutes
} from "../../domain/metaReviewGate/gateRoutingTypes.js";
export type {
  MetaReviewGateErrorDiagnostics,
  MetaReviewGateReasonCode,
  MetaReviewGateRoute,
  MetaReviewGateThresholdMetadata,
  MetaReviewGateThresholdStatus
} from "../../domain/metaReviewGate/gateRoutingTypes.js";
export {
  resolveMetaReviewGateNotifyTmuxCapabilities,
  resolveMetaReviewGatePaneBindingTmuxCapabilities
} from "./metaReviewGateRuntimeCapabilities.js";
export type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGateNotifyTmuxCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities,
  MetaReviewGatePaneBindingTmuxCapabilities,
  MetaReviewGateRuntimeCapabilities,
  MetaReviewRuntimeDeliveryObservation,
  NotifyMetaReviewerSubmissionRequest,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput,
  ResolveMetaReviewerPaneWarning,
  ResolveMetaReviewerPaneWarningInput
} from "./metaReviewGateRuntimeCapabilities.js";

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  metaReviewRun?: MetaReviewResult;
  warnings?: string[];
  diagnostics?: string[];
}
