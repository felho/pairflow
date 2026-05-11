import type { LoadedStateSnapshot } from "../../../../ports/stateSnapshots.js";
import {
  appendDeactivateTelemetry,
  buildCleanRerunRuntimeDelivery,
  deactivateCleanRerunMetaReviewerPane,
  withDeactivateTelemetryOnDelivery
} from "../cleanRerun/metaReviewGateCleanRerunDelivery.js";
import {
  type CleanRerunDeliveryCapableInput,
  hasCleanRerunDeliveryCapabilities,
  type RouteCleanMetaReviewRerunInput
} from "../cleanRerun/metaReviewGateCleanRerunContract.js";
import {
  appendCleanRerunKickoff,
  failCleanRerunClosed,
  stageCleanRerunRunningState
} from "../cleanRerun/metaReviewGateCleanRerunDispatch.js";
import {
  persistCleanRerunDeliveryObservation,
  reconcileCleanRerunObservedResult
} from "../cleanRerun/metaReviewGateCleanRerunObservation.js";
import { resolveCleanRerunPaneBinding } from "../cleanRerun/metaReviewGateCleanRerunPaneBinding.js";
import type { MetaReviewGateResult } from "../../../../shared/metaReviewGate/metaReviewGateResultContract.js";

function isMetaReviewGateResult(
  value: LoadedStateSnapshot | MetaReviewGateResult
): value is MetaReviewGateResult {
  return "route" in value;
}

export async function routeCleanMetaReviewRerun(
  input: RouteCleanMetaReviewRerunInput
): Promise<MetaReviewGateResult> {
  if (!hasCleanRerunDeliveryCapabilities(input.finalizeInput)) {
    return failCleanRerunClosed({
      routeInput: input,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: delivery_capability_unavailable",
      loaded: input.finalizeInput.loaded
    });
  }
  const deliveryCapableInput: RouteCleanMetaReviewRerunInput & {
    finalizeInput: CleanRerunDeliveryCapableInput;
  } = {
    ...input,
    finalizeInput: input.finalizeInput
  };

  const staged = await stageCleanRerunRunningState(input);
  if (isMetaReviewGateResult(staged)) {
    return staged;
  }

  const kickoffResult = await appendCleanRerunKickoff({
    routeInput: input,
    metaReviewRunningState: staged
  });
  if (kickoffResult.route !== "meta_review_running") {
    return kickoffResult;
  }

  const paneBinding = await resolveCleanRerunPaneBinding({
    routeInput: deliveryCapableInput,
    kickoffResult,
    metaReviewRunningState: staged
  });
  if ("route" in paneBinding) {
    return paneBinding;
  }
  let delivery = paneBinding.delivery;
  if (paneBinding.shouldDeactivate && paneBinding.delivery.status !== "confirmed") {
    const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
      input.finalizeInput
    );
    delivery = withDeactivateTelemetryOnDelivery({
      delivery: paneBinding.delivery,
      deactivateReason
    });
  }

  const executionContext = kickoffResult.state.meta_review?.execution_context ?? null;
  if (executionContext === null) {
    const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
      input.finalizeInput
    );
    return failCleanRerunClosed({
      routeInput: input,
      fallbackReason: appendDeactivateTelemetry({
        fallbackReason:
          "META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: execution_context_missing",
        deactivateReason
      }),
      loaded: staged
    });
  }
  const observed = await persistCleanRerunDeliveryObservation({
    routeInput: deliveryCapableInput,
    kickoffResult,
    metaReviewRunningState: staged,
    delivery: buildCleanRerunRuntimeDelivery({
      executionContext,
      finalizeInput: input.finalizeInput,
      delivery
    })
  });
  if (isMetaReviewGateResult(observed)) {
    return observed;
  }
  if (delivery.status === "failed") {
    return failCleanRerunClosed({
      routeInput: input,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: pane_notification_failed=${delivery.reasonCode ?? "unknown"}`,
      loaded: observed
    });
  }

  return reconcileCleanRerunObservedResult({
    routeInput: deliveryCapableInput,
    kickoffResult,
    observedState: observed
  });
}
