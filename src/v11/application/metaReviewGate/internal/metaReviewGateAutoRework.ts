import { appendAutoReworkDecision } from "./metaReviewGateAutoReworkEnvelope.js";
import { buildAutoReworkResumedState } from "./metaReviewGateAutoReworkState.js";
import {
  restoreReadyStateAfterAppendFailure,
  writeAutoReworkResumedState
} from "./metaReviewGateAutoReworkPersistence.js";
import type { DispatchAutoReworkInput } from "./metaReviewGateAutoReworkContract.js";
import type { MetaReviewGateResult } from "../../../shared/metaReviewGate/metaReviewGateResultContract.js";

export async function dispatchAutoRework(
  input: DispatchAutoReworkInput
): Promise<MetaReviewGateResult> {
  const reworkMessage =
    input.reworkTargetMessage ?? input.runResultForRouting.rework_target_message;
  if (reworkMessage === null || reworkMessage.trim().length === 0) {
    return input.persistDispatchFailedHumanRoute({
      loaded: input.finalizeInput.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch",
      rollbackStateOnAppendFailure: input.finalizeInput.loaded.state
    });
  }

  const { resumed, nowIso } = buildAutoReworkResumedState(input.finalizeInput);
  const resumedWritten = await writeAutoReworkResumedState({
    finalizeInput: input.finalizeInput,
    resumed
  });

  try {
    const dispatched = await appendAutoReworkDecision({
      finalizeInput: input.finalizeInput,
      resumedWritten,
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      findingsForPayload: input.findingsForPayload,
      reworkMessage
    });

    return {
      bubbleId: input.finalizeInput.resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: resumedWritten.state,
      metaReviewRun: input.runResultForRouting
    };
  } catch (error) {
    const appendReason = error instanceof Error ? error.message : String(error);
    const readyLoaded = await restoreReadyStateAfterAppendFailure({
      finalizeInput: input.finalizeInput,
      resumedWritten,
      nowIso
    });
    return input.persistDispatchFailedHumanRoute({
      loaded: readyLoaded,
      expectedState: "READY_FOR_HUMAN_APPROVAL",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}`,
      rollbackStateOnAppendFailure: readyLoaded.state
    });
  }
}
