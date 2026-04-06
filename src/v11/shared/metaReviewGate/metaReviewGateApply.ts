import type { LoadedStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { StateStoreConflictError } from "../../infrastructure/state/stateStore.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import { resolveActiveMetaReviewRuntimeDelivery } from "../metaReview/metaReviewSnapshot.js";
import { readTranscriptEnvelopes } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import type { BubbleMetaReviewRuntimeDeliveryState } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import {
  resolveMetaReviewerPaneWarning,
  stageMetaReviewRunningState,
  throwMetaReviewRunningStageFailure
} from "./metaReviewGateApplyHelpers.js";
import { routeMetaReviewKickoffOrRunFailed } from "./metaReviewGateApplyRunRouting.js";
import {
  initializeApplyMetaReviewGateExecutionContext,
  type ApplyMetaReviewGateExecutionContext
} from "./metaReviewGateApplyContext.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateRoute,
  MetaReviewGateResult
} from "./metaReviewGateTypes.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

const persistedHumanGateRoutes = new Set<
  Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">
>([
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
]);

function resolvePersistedHumanGateRoute(
  envelope: ProtocolEnvelope
): Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework"> | null {
  const route = envelope.payload.metadata?.meta_review_gate_route;
  if (typeof route !== "string" || !persistedHumanGateRoutes.has(route as never)) {
    return null;
  }
  return route as Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">;
}

async function reconcileObservedGateResult(input: {
  context: ApplyMetaReviewGateExecutionContext;
  kickoffResult: MetaReviewGateResult;
  observedState: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  if (isMetaReviewExecutionContextActiveState(input.observedState.state)) {
    return {
      ...input.kickoffResult,
      state: input.observedState.state
    };
  }

  const transcript = await readTranscriptEnvelopes(
    input.context.resolved.bubblePaths.transcriptPath,
    {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }
  );
  const round =
    input.observedState.state.meta_review?.execution_context?.round ??
    input.observedState.state.round;

  if (input.observedState.state.state === "RUNNING") {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      const envelope = transcript[index]!;
      if (
        envelope.type === "APPROVAL_DECISION" &&
        envelope.round === round &&
        envelope.sender === "orchestrator" &&
        envelope.recipient === input.context.resolved.bubbleConfig.agents.implementer &&
        envelope.payload.decision === "rework"
      ) {
        return {
          bubbleId: input.context.resolved.bubbleId,
          route: "auto_rework",
          gateSequence: index + 1,
          gateEnvelope: envelope,
          state: input.observedState.state
        };
      }
    }
  }

  if (
    input.observedState.state.state === "READY_FOR_HUMAN_APPROVAL"
  ) {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      const envelope = transcript[index]!;
      if (
        envelope.type === "APPROVAL_REQUEST" &&
        envelope.round === round &&
        envelope.sender === "orchestrator" &&
        envelope.recipient === "human"
      ) {
        const route = resolvePersistedHumanGateRoute(envelope);
        if (route !== null) {
          return {
            bubbleId: input.context.resolved.bubbleId,
            route,
            gateSequence: index + 1,
            gateEnvelope: envelope,
            state: input.observedState.state
          };
        }
      }
    }
  }

  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: runtime delivery observation saw progressed state=${input.observedState.state.state} without a matching gate envelope in the transcript.`
  );
}

async function persistRuntimeDeliveryObservation(input: {
  context: ApplyMetaReviewGateExecutionContext;
  loaded: LoadedStateSnapshot;
  runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState;
}): Promise<LoadedStateSnapshot> {
  const currentMetaReview = input.loaded.state.meta_review;
  if (currentMetaReview === undefined) {
    return input.loaded;
  }
  try {
    return await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      {
        ...input.loaded.state,
        meta_review: {
          ...currentMetaReview,
          runtime_delivery: input.runtimeDelivery
        }
      },
      {
        expectedFingerprint: input.loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (!(error instanceof StateStoreConflictError)) {
      throw error;
    }
    const latest = await input.context.readState(
      input.context.resolved.bubblePaths.statePath
    );
    if (!isMetaReviewExecutionContextActiveState(latest.state)) {
      return latest;
    }
    const latestMetaReview = latest.state.meta_review;
    if (
      latestMetaReview === undefined ||
      resolveActiveMetaReviewRuntimeDelivery({
        executionContext: latestMetaReview.execution_context,
        runtimeDelivery: input.runtimeDelivery
      }) === null
    ) {
      return latest;
    }
    try {
      return await input.context.writeState(
        input.context.resolved.bubblePaths.statePath,
        {
          ...latest.state,
          meta_review: {
            ...latestMetaReview,
            runtime_delivery: input.runtimeDelivery
          }
        },
        {
          expectedFingerprint: latest.fingerprint,
          expectedState: "RUNNING"
        }
      );
    } catch (retryError) {
      if (!(retryError instanceof StateStoreConflictError)) {
        throw retryError;
      }
      return input.context.readState(input.context.resolved.bubblePaths.statePath);
    }
  }
}

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

  const paneBinding = await resolveMetaReviewerPaneWarning({
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
  const runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState = {
    status: paneBinding.delivery.status,
    reason_code: paneBinding.delivery.reasonCode,
    message: paneBinding.delivery.message,
    observed_at: context.nowIso,
    observed_for_handoff_id: executionContext?.handoff_id ?? null,
    observed_for_round: executionContext?.round ?? kickoffResult.state.round
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
