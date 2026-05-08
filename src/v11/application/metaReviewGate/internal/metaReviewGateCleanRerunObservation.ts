import type { LoadedStateSnapshot } from "../../../ports/stateSnapshots.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../../types/bubble.js";
import { reconcileObservedGateResult } from "./metaReviewGateApplyObservation.js";
import { persistRuntimeDeliveryObservation } from "./metaReviewGateApplyPersistence.js";
import { appendDeactivateTelemetry, deactivateCleanRerunMetaReviewerPane } from "./metaReviewGateCleanRerunDelivery.js";
import type {
  CleanRerunDeliveryCapableInput,
  RouteCleanMetaReviewRerunInput
} from "./metaReviewGateCleanRerunContract.js";
import { failCleanRerunClosed } from "./metaReviewGateCleanRerunDispatch.js";
import type { MetaReviewGateResult } from "../../../shared/metaReviewGate/metaReviewGateResultContract.js";

export async function persistCleanRerunDeliveryObservation(input: {
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

export async function reconcileCleanRerunObservedResult(input: {
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
