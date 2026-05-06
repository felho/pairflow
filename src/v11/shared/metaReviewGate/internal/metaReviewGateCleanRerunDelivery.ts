import { buildMetaReviewRuntimeDeliveryCorrelation } from "../../metaReview/metaReviewSnapshot.js";
import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../../types/bubble.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../metaReviewGateCurrentRunTypes.js";

type MetaReviewPaneWarningResult = Awaited<
  ReturnType<
    NonNullable<FinalizeCurrentRunMetaReviewGateInput["resolvePaneWarning"]>
  >
>;
type MetaReviewPaneDelivery = MetaReviewPaneWarningResult["delivery"];
type MetaReviewExecutionContext =
  NonNullable<LoadedStateSnapshot["state"]["meta_review"]>["execution_context"];

export function appendDeactivateTelemetry(input: {
  fallbackReason: string;
  deactivateReason: string | null;
}): string {
  if (input.deactivateReason === null) return input.fallbackReason;
  return `${input.fallbackReason}; deactivate_error=${input.deactivateReason}`;
}

export function withDeactivateTelemetryOnDelivery(input: {
  delivery: MetaReviewPaneDelivery;
  deactivateReason: string | null;
}): MetaReviewPaneDelivery {
  if (input.deactivateReason === null) {
    return input.delivery;
  }
  return {
    ...input.delivery,
    reasonCode:
      input.delivery.reasonCode ?? "META_REVIEW_PANE_DEACTIVATE_FAILED",
    message: `${input.delivery.message}; deactivate_error=${input.deactivateReason}`
  };
}

export function buildCleanRerunRuntimeDelivery(input: {
  executionContext: MetaReviewExecutionContext;
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  delivery: MetaReviewPaneDelivery;
}): BubbleMetaReviewRuntimeDeliveryState {
  const correlation = buildMetaReviewRuntimeDeliveryCorrelation(
    input.executionContext
  );
  return {
    status: input.delivery.status,
    reason_code: input.delivery.reasonCode,
    message: input.delivery.message,
    observed_at: input.finalizeInput.now.toISOString(),
    observed_for_handoff_id: correlation.observedForHandoffId,
    observed_for_round: correlation.observedForRound
  };
}
