import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../types/bubble.js";
import {
  buildMetaReviewRuntimeDeliveryCorrelation
} from "../metaReview/metaReviewSnapshot.js";
import {
  stageMetaReviewRunningState,
  throwMetaReviewRunningStageFailure
} from "./metaReviewGateApplyHelpers.js";
import { routeMetaReviewKickoffOrRunFailed } from "./metaReviewGateApplyRunRouting.js";
import {
  initializeApplyMetaReviewGateExecutionContext
} from "./metaReviewGateApplyContext.js";
import { reconcileObservedGateResult } from "./metaReviewGateApplyObservation.js";
import { persistRuntimeDeliveryObservation } from "./metaReviewGateApplyPersistence.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateResult
} from "./metaReviewGateTypes.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const context = await initializeApplyMetaReviewGateExecutionContext(
    input,
    dependencies
  );

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    metaReviewRunningState = await stageMetaReviewRunningState({
      bubbleId: context.resolved.bubbleId,
      loadedRunning: context.loadedRunning,
      nowIso: context.nowIso,
      watchdogTimeoutMinutes: context.resolved.bubbleConfig.watchdog_timeout_minutes,
      statePath: context.resolved.bubblePaths.statePath,
      writeState: context.writeState
    });
  } catch (error) {
    return throwMetaReviewRunningStageFailure({
      rootError: error,
      stageReasonCode: "META_REVIEW_GATE_META_REVIEW_STAGE_TRANSITION_FAILED"
    });
  }

  const kickoffResult = await routeMetaReviewKickoffOrRunFailed({
    context,
    convergenceSummary: input.summary,
    metaReviewRunningState,
    shouldDeactivateMetaReviewerPane: false
  });
  if (kickoffResult.route !== "meta_review_running") {
    return kickoffResult;
  }

  const paneBinding = await context.resolvePaneWarning({
    setMetaReviewerPane: context.setMetaReviewerPane,
    notifySubmissionRequest: context.notifySubmissionRequest,
    runTmuxRunner: context.runTmuxRunner,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    bubbleId: context.resolved.bubbleId,
    round: kickoffResult.state.round,
    now: context.now,
    taskArtifactPath: context.resolved.bubblePaths.taskArtifactPath,
    pairflowCommandProfile: context.resolved.bubbleConfig.pairflow_command_profile
  });
  if (paneBinding.shouldDeactivate && paneBinding.delivery.status !== "confirmed") {
    await context.deactivateMetaReviewerPane();
  }
  const executionContext = kickoffResult.state.meta_review?.execution_context ?? null;
  if (executionContext === null) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_EXECUTION_CONTEXT_MISSING: runtime delivery observation requires active meta-review execution_context authority",
      {
        bubbleId: context.resolved.bubbleId,
        round: kickoffResult.state.round,
        stageReasonCode: "META_REVIEW_GATE_EXECUTION_CONTEXT_MISSING"
      }
    );
  }
  const correlation = buildMetaReviewRuntimeDeliveryCorrelation(executionContext);
  const runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState = {
    status: paneBinding.delivery.status,
    reason_code: paneBinding.delivery.reasonCode,
    message: paneBinding.delivery.message,
    observed_at: context.nowIso,
    observed_for_handoff_id: correlation.observedForHandoffId,
    observed_for_round: correlation.observedForRound
  };
  let observedState: LoadedStateSnapshot;
  try {
    observedState = await persistRuntimeDeliveryObservation({
      context,
      loaded: metaReviewRunningState,
      runtimeDelivery
    });
  } catch (error) {
    await context.deactivateMetaReviewerPane();
    throw error;
  }
  return reconcileObservedGateResult({
    context,
    kickoffResult,
    observedState
  });
}
