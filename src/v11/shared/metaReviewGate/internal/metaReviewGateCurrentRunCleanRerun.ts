import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";
import { buildMetaReviewRuntimeDeliveryCorrelation } from "../../metaReview/metaReviewSnapshot.js";
import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import { appendMetaReviewKickoffEnvelope, stageMetaReviewRunningState } from "./metaReviewGateApplyHelpers.js";
import { reconcileObservedGateResult } from "./metaReviewGateApplyObservation.js";
import { persistRuntimeDeliveryObservation } from "./metaReviewGateApplyPersistence.js";
import { persistDispatchFailedHumanRoute } from "./metaReviewGateCurrentRunRoutePersistence.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../metaReviewGateCurrentRunTypes.js";
import { buildGateLockPath, setMetaReviewConsecutiveCleanRuns } from "./metaReviewGateShared.js";
import type { MetaReviewGateResult } from "../metaReviewGateResultContract.js";

type MetaReviewPaneWarningResult = Awaited<
  ReturnType<
    NonNullable<FinalizeCurrentRunMetaReviewGateInput["resolvePaneWarning"]>
  >
>;
type MetaReviewPaneDelivery = MetaReviewPaneWarningResult["delivery"];
type MetaReviewExecutionContext = NonNullable<LoadedStateSnapshot["state"]["meta_review"]>["execution_context"];

interface RouteCleanMetaReviewRerunInput {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  updatedStreak: number;
}

type CleanRerunDeliveryCapableInput = FinalizeCurrentRunMetaReviewGateInput & {
  readState: NonNullable<FinalizeCurrentRunMetaReviewGateInput["readState"]>;
  readTranscript: NonNullable<FinalizeCurrentRunMetaReviewGateInput["readTranscript"]>;
  setMetaReviewerPane: NonNullable<FinalizeCurrentRunMetaReviewGateInput["setMetaReviewerPane"]>;
  resolvePaneWarning: NonNullable<FinalizeCurrentRunMetaReviewGateInput["resolvePaneWarning"]>;
  resolved: FinalizeCurrentRunMetaReviewGateInput["resolved"] & {
    bubblePaths: FinalizeCurrentRunMetaReviewGateInput["resolved"]["bubblePaths"] & {
      sessionsPath: string;
      taskArtifactPath: string;
    };
  };
};

function failCleanRerunClosed(input: {
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

function buildCleanRerunDispatchFailureRollbackState(
  state: LoadedStateSnapshot["state"]
): LoadedStateSnapshot["state"] {
  const resetState = setMetaReviewConsecutiveCleanRuns(state, 0);
  if (resetState.meta_review === undefined) return resetState;
  return {
    ...resetState,
    meta_review: {
      ...resetState.meta_review,
      runtime_delivery: null
    }
  };
}

function appendDeactivateTelemetry(input: {
  fallbackReason: string;
  deactivateReason: string | null;
}): string {
  if (input.deactivateReason === null) return input.fallbackReason;
  return `${input.fallbackReason}; deactivate_error=${input.deactivateReason}`;
}

function isMetaReviewGateResult(
  value: LoadedStateSnapshot | MetaReviewGateResult
): value is MetaReviewGateResult {
  return "route" in value;
}

async function stageCleanRerunRunningState(
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

async function appendCleanRerunKickoff(input: {
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

function hasCleanRerunDeliveryCapabilities(
  input: FinalizeCurrentRunMetaReviewGateInput
): input is CleanRerunDeliveryCapableInput {
  return (
    input.readState !== undefined &&
    input.readTranscript !== undefined &&
    input.setMetaReviewerPane !== undefined &&
    input.resolvePaneWarning !== undefined &&
    input.resolved.bubblePaths.sessionsPath !== undefined &&
    input.resolved.bubblePaths.taskArtifactPath !== undefined
  );
}

function withDeactivateTelemetryOnDelivery(input: {
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

function buildCleanRerunRuntimeDelivery(input: {
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

async function deactivateCleanRerunMetaReviewerPane(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<string | null> {
  if (
    input.setMetaReviewerPane === undefined ||
    input.resolved.bubblePaths.sessionsPath === undefined
  ) {
    return "deactivate_capability_unavailable";
  }
  try {
    await input.setMetaReviewerPane({
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      bubbleId: input.resolved.bubbleId,
      active: false,
      now: input.now
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
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
