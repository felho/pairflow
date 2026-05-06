import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../../types/bubble.js";
import { reconcileObservedGateResult } from "./metaReviewGateApplyObservation.js";
import { persistRuntimeDeliveryObservation } from "./metaReviewGateApplyPersistence.js";
import {
  appendDeactivateTelemetry,
  buildCleanRerunRuntimeDelivery,
  deactivateCleanRerunMetaReviewerPane,
  withDeactivateTelemetryOnDelivery
} from "./metaReviewGateCleanRerunDelivery.js";
import {
  type CleanRerunDeliveryCapableInput,
  hasCleanRerunDeliveryCapabilities,
  type MetaReviewPaneWarningResult,
  type RouteCleanMetaReviewRerunInput
} from "./metaReviewGateCleanRerunContract.js";
import {
  appendCleanRerunKickoff,
  failCleanRerunClosed,
  stageCleanRerunRunningState
} from "./metaReviewGateCleanRerunDispatch.js";
import type { MetaReviewGateResult } from "../metaReviewGateResultContract.js";

function isMetaReviewGateResult(
  value: LoadedStateSnapshot | MetaReviewGateResult
): value is MetaReviewGateResult {
  return "route" in value;
}

async function resolveCleanRerunPaneBinding(input: {
  routeInput: RouteCleanMetaReviewRerunInput & {
    finalizeInput: CleanRerunDeliveryCapableInput;
  };
  kickoffResult: MetaReviewGateResult;
  metaReviewRunningState: LoadedStateSnapshot;
}): Promise<MetaReviewPaneWarningResult | MetaReviewGateResult> {
  const finalizeInput = input.routeInput.finalizeInput;
  try {
    return await finalizeInput.resolvePaneWarning({
      setMetaReviewerPane: finalizeInput.setMetaReviewerPane,
      ...(finalizeInput.notifySubmissionRequest !== undefined
        ? { notifySubmissionRequest: finalizeInput.notifySubmissionRequest }
        : {}),
      ...(finalizeInput.runtime !== undefined
        ? { runtime: finalizeInput.runtime }
        : {}),
      sessionsPath: finalizeInput.resolved.bubblePaths.sessionsPath,
      bubbleId: finalizeInput.resolved.bubbleId,
      round: input.kickoffResult.state.round,
      now: finalizeInput.now,
      taskArtifactPath: finalizeInput.resolved.bubblePaths.taskArtifactPath,
      pairflowCommandProfile:
        finalizeInput.resolved.bubbleConfig.pairflow_command_profile ?? "external",
      metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const executionContext =
      input.kickoffResult.state.meta_review?.execution_context ?? null;
    if (executionContext !== null) {
      const observed = await persistCleanRerunDeliveryObservation({
        routeInput: input.routeInput,
        kickoffResult: input.kickoffResult,
        metaReviewRunningState: input.metaReviewRunningState,
        delivery: buildCleanRerunRuntimeDelivery({
          executionContext,
          finalizeInput,
          delivery: {
            status: "failed",
            reasonCode: "META_REVIEW_PANE_NOTIFICATION_ERROR",
            message: `meta-review pane notification failed: ${reason}`
          }
        })
      });
      if (isMetaReviewGateResult(observed)) {
        return observed;
      }
      const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
        finalizeInput
      );
      return failCleanRerunClosed({
        routeInput: input.routeInput,
        fallbackReason: appendDeactivateTelemetry({
          fallbackReason:
            `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: pane_notification_error=${reason}`,
          deactivateReason
        }),
        loaded: observed
      });
    }
    const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
      finalizeInput
    );
    return failCleanRerunClosed({
      routeInput: input.routeInput,
      fallbackReason: appendDeactivateTelemetry({
        fallbackReason:
          `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: pane_notification_error=${reason}`,
        deactivateReason
      }),
      loaded: input.metaReviewRunningState
    });
  }
}

async function persistCleanRerunDeliveryObservation(input: {
  routeInput: RouteCleanMetaReviewRerunInput & {
    finalizeInput: CleanRerunDeliveryCapableInput;
  };
  kickoffResult: MetaReviewGateResult;
  metaReviewRunningState: LoadedStateSnapshot;
  delivery: BubbleMetaReviewRuntimeDeliveryState;
}): Promise<LoadedStateSnapshot | MetaReviewGateResult> {
  const finalizeInput = input.routeInput.finalizeInput;
  try {
    return await persistRuntimeDeliveryObservation({
      context: {
        readState: finalizeInput.readState,
        writeState: finalizeInput.writeState,
        resolved: {
          bubblePaths: {
            statePath: finalizeInput.resolved.bubblePaths.statePath
          }
        }
      },
      loaded: input.metaReviewRunningState,
      runtimeDelivery: input.delivery
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
      finalizeInput
    );
    return failCleanRerunClosed({
      routeInput: input.routeInput,
      fallbackReason: appendDeactivateTelemetry({
        fallbackReason:
          `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: delivery_observation_error=${reason}`,
        deactivateReason
      }),
      loaded: input.metaReviewRunningState
    });
  }
}

async function reconcileCleanRerunObservedResult(input: {
  routeInput: RouteCleanMetaReviewRerunInput & {
    finalizeInput: CleanRerunDeliveryCapableInput;
  };
  kickoffResult: MetaReviewGateResult;
  observedState: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.routeInput.finalizeInput;
  try {
    const result = await reconcileObservedGateResult({
      context: {
        readTranscript: finalizeInput.readTranscript,
        resolved: {
          bubbleId: finalizeInput.resolved.bubbleId,
          bubbleConfig: {
            agents: {
              implementer: finalizeInput.resolved.bubbleConfig.agents.implementer
            }
          },
          bubblePaths: {
            transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath
          }
        }
      },
      kickoffResult: input.kickoffResult,
      observedState: input.observedState
    });
    finalizeInput.observeGateResultReconciled?.();
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const deactivateReason = await deactivateCleanRerunMetaReviewerPane(
      finalizeInput
    );
    return failCleanRerunClosed({
      routeInput: input.routeInput,
      fallbackReason: appendDeactivateTelemetry({
        fallbackReason:
          `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: observation_reconcile_error=${reason}`,
        deactivateReason
      }),
      loaded: input.observedState
    });
  }
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
