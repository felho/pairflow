import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import {
  persistMetaReviewRunFailedRoute,
  resolveMetaReviewerPaneWarning,
  restoreRunningAfterStagedReadyFailure,
  routeStickyHumanGateBypass,
  stageMetaReviewRunningState
} from "./metaReviewGateApplyHelpers.js";
import { normalizeMetaReviewSnapshot } from "./metaReviewGateShared.js";
import { routeMetaReviewKickoffOrRunFailed } from "./metaReviewGateApplyRunRouting.js";
import { initializeApplyMetaReviewGateExecutionContext } from "./metaReviewGateApplyContext.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateResult
} from "./metaReviewGateTypes.js";

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const context = await initializeApplyMetaReviewGateExecutionContext(
    input,
    dependencies
  );

  const readyMetaReview = normalizeMetaReviewSnapshot(
    context.readyForApproval.state.meta_review
  );

  if (readyMetaReview.sticky_human_gate) {
    return routeStickyHumanGateBypass({
      appendEnvelope: context.appendEnvelope,
      writeState: context.writeState,
      readFileFn: context.readFileFn,
      bubblePaths: context.resolved.bubblePaths,
      lockPath: context.lockPath,
      now: context.now,
      nowIso: context.nowIso,
      bubbleId: context.resolved.bubbleId,
      summary: input.summary,
      refs: context.refs,
      ...(input.findings !== undefined ? { findings: input.findings } : {}),
      loadedRunning: context.loadedRunning,
      readyForApproval: context.readyForApproval
    });
  }

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    metaReviewRunningState = await stageMetaReviewRunningState({
      readyForApproval: context.readyForApproval,
      nowIso: context.nowIso,
      statePath: context.resolved.bubblePaths.statePath,
      writeState: context.writeState
    });
  } catch (error) {
    return restoreRunningAfterStagedReadyFailure({
      rootError: error,
      stageReasonCode: "META_REVIEW_GATE_META_REVIEW_STAGE_TRANSITION_FAILED",
      writeState: context.writeState,
      statePath: context.resolved.bubblePaths.statePath,
      loadedRunning: context.loadedRunning,
      readyForApproval: context.readyForApproval
    });
  }

  const paneBinding = await resolveMetaReviewerPaneWarning({
    setMetaReviewerPane: context.setMetaReviewerPane,
    notifySubmissionRequest: context.notifySubmissionRequest,
    runTmuxRunner: context.runTmuxRunner,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    bubbleId: context.resolved.bubbleId,
    round: metaReviewRunningState.state.round,
    now: context.now
  });
  const metaReviewerPaneWarning = paneBinding.warning;
  const shouldDeactivateMetaReviewerPane = paneBinding.shouldDeactivate;

  if (metaReviewerPaneWarning !== null) {
    if (shouldDeactivateMetaReviewerPane) {
      await context.deactivateMetaReviewerPane();
    }
    return persistMetaReviewRunFailedRoute({
      appendEnvelope: context.appendEnvelope,
      writeState: context.writeState,
      statePath: context.resolved.bubblePaths.statePath,
      transcriptPath: context.resolved.bubblePaths.transcriptPath,
      inboxPath: context.resolved.bubblePaths.inboxPath,
      lockPath: context.lockPath,
      now: context.now,
      nowIso: context.nowIso,
      bubbleId: context.resolved.bubbleId,
      convergenceSummary: input.summary,
      fallbackReason:
        `META_REVIEW_GATE_RUN_FAILED: structured submit request unavailable (${metaReviewerPaneWarning}).`,
      refs: context.refs,
      loaded: metaReviewRunningState
    });
  }

  return routeMetaReviewKickoffOrRunFailed({
    context,
    convergenceSummary: input.summary,
    metaReviewRunningState,
    shouldDeactivateMetaReviewerPane
  });
}
