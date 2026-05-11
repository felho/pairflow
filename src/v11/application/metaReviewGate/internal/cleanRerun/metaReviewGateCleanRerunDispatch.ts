import type { LoadedStateSnapshot } from "../../../../ports/stateSnapshots.js";
import { appendMetaReviewKickoffEnvelope, stageMetaReviewRunningState } from "../apply/metaReviewGateApplyHelpers.js";
import { buildCleanRerunDispatchFailureRollbackState } from "./metaReviewGateCleanRerunFailureState.js";
import type { RouteCleanMetaReviewRerunInput } from "./metaReviewGateCleanRerunContract.js";
import { persistDispatchFailedHumanRoute } from "../currentRun/routePersistence.js";
import { buildGateLockPath } from "../metaReviewGateShared.js";
import { setMetaReviewConsecutiveCleanRuns } from "../../../../domain/metaReviewGate/snapshotState.js";
import type { MetaReviewGateResult } from "../../../../shared/metaReviewGate/metaReviewGateResultContract.js";

export function failCleanRerunClosed(input: {
  routeInput: RouteCleanMetaReviewRerunInput;
  fallbackReason: string;
  loaded: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistDispatchFailedHumanRoute({
    finalizeInput: input.routeInput.finalizeInput,
    loaded: input.loaded,
    expectedState: "RUNNING",
    runResultForRouting: input.routeInput.runResultForRouting,
    parityMetadata: input.routeInput.parityMetadata,
    fallbackReason: input.fallbackReason,
    rollbackStateOnAppendFailure: buildCleanRerunDispatchFailureRollbackState(
      input.loaded.state
    )
  });
}

export async function stageCleanRerunRunningState(
  input: RouteCleanMetaReviewRerunInput
): Promise<LoadedStateSnapshot | MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  const loadedWithUpdatedStreak: LoadedStateSnapshot = {
    ...finalizeInput.loaded,
    state: setMetaReviewConsecutiveCleanRuns(
      finalizeInput.loaded.state,
      input.updatedStreak
    )
  };

  try {
    return await stageMetaReviewRunningState({
      bubbleId: finalizeInput.resolved.bubbleId,
      loadedRunning: loadedWithUpdatedStreak,
      metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
      nowIso: finalizeInput.now.toISOString(),
      watchdogTimeoutMinutes:
        finalizeInput.resolved.bubbleConfig.watchdog_timeout_minutes,
      statePath: finalizeInput.resolved.bubblePaths.statePath,
      writeState: finalizeInput.writeState
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failCleanRerunClosed({
      routeInput: input,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: stage_error=${reason}`,
      loaded: finalizeInput.loaded
    });
  }
}

export async function appendCleanRerunKickoff(input: {
  routeInput: RouteCleanMetaReviewRerunInput;
  metaReviewRunningState: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.routeInput.finalizeInput;
  const handoffId =
    input.metaReviewRunningState.state.meta_review?.execution_context
      ?.handoff_id;
  if (handoffId === undefined) {
    return failCleanRerunClosed({
      routeInput: input.routeInput,
      fallbackReason:
        "META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: execution_context_missing_before_kickoff",
      loaded: input.metaReviewRunningState
    });
  }
  try {
    const appended = await appendMetaReviewKickoffEnvelope({
      appendEnvelope: finalizeInput.appendEnvelope,
      transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath,
      inboxPath: finalizeInput.resolved.bubblePaths.inboxPath,
      lockPath: buildGateLockPath({
        locksDir: finalizeInput.resolved.bubblePaths.locksDir,
        bubbleId: finalizeInput.resolved.bubbleId
      }),
      now: finalizeInput.now,
      bubbleId: finalizeInput.resolved.bubbleId,
      round: input.metaReviewRunningState.state.round,
      handoffId,
      metaReviewerAgent: finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
      refs: finalizeInput.refs
    });

    return {
      bubbleId: finalizeInput.resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: input.metaReviewRunningState.state,
      metaReviewRun: input.routeInput.runResultForRouting
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failCleanRerunClosed({
      routeInput: input.routeInput,
      fallbackReason:
        `META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: append_error=${reason}`,
      loaded: input.metaReviewRunningState
    });
  }
}
