import { applyStateTransition } from "../../domain/state/machine.js";
import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";
import { assertValidBubbleStateSnapshot } from "../../shared/state/stateSchema.js";
import { clearLiveMetaReviewSnapshot } from "../metaReview/metaReviewSnapshot.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import { isNamedError } from "../errors/namedError.js";
import type {
  AgentName,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  buildGateLockPath,
  incrementAutoReworkCount,
  normalizeMetaReviewSnapshot,
  resolveFindingsParityMetadataForEnvelope
} from "./metaReviewGateShared.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult
} from "./metaReviewGateTypes.js";

interface AutoReworkFinalizeInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: string;
        reviewer: string;
      };
    };
    bubblePaths: {
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}

interface PersistDispatchFailedHumanRouteInput {
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}

interface DispatchAutoReworkInput {
  finalizeInput: AutoReworkFinalizeInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  persistDispatchFailedHumanRoute: (
    input: PersistDispatchFailedHumanRouteInput
  ) => Promise<MetaReviewGateResult>;
}

function toGateConflictError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    }
  );
}

function toGateTransitionError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

function buildAutoReworkResumedState(
  finalizeInput: AutoReworkFinalizeInput
): { resumed: BubbleStateSnapshot; nowIso: string } {
  const nowIso = finalizeInput.now.toISOString();
  const nextRound = finalizeInput.loaded.state.round + 1;
  return {
    nowIso,
    resumed: assertValidBubbleStateSnapshot({
      ...finalizeInput.loaded.state,
      state: "RUNNING",
      round: nextRound,
      active_agent: finalizeInput.resolved.bubbleConfig.agents.implementer,
      active_role: "implementer",
      execution_context: buildRunningExecutionContext({
        bubbleId: finalizeInput.loaded.state.bubble_id,
        round: nextRound,
        activeRole: "implementer",
        startedAt: nowIso,
        watchdogTimeoutMinutes:
          finalizeInput.resolved.bubbleConfig.watchdog_timeout_minutes
      }),
      active_since: nowIso,
      last_command_at: nowIso,
      round_role_history: [
        ...finalizeInput.loaded.state.round_role_history,
        {
          round: nextRound,
          implementer: finalizeInput.resolved.bubbleConfig.agents.implementer,
          reviewer: finalizeInput.resolved.bubbleConfig.agents.reviewer,
          switched_at: nowIso
        }
      ],
      meta_review: clearLiveMetaReviewSnapshot(
        finalizeInput.loaded.state.meta_review
      )
    })
  };
}

async function writeAutoReworkResumedState(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumed: BubbleStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      input.resumed,
      {
        expectedFingerprint: input.finalizeInput.loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (isNamedError(error, "StateStoreConflictError")) {
      throw toGateConflictError(error);
    }
    throw toGateTransitionError(error);
  }
}

async function appendAutoReworkDecision(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  reworkMessage: string;
}): Promise<Awaited<ReturnType<AppendProtocolEnvelopePort>>> {
  return await input.finalizeInput.appendEnvelope({
    transcriptPath: input.finalizeInput.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.finalizeInput.resolved.bubblePaths.inboxPath],
    lockPath: buildGateLockPath({
      locksDir: input.finalizeInput.resolved.bubblePaths.locksDir,
      bubbleId: input.finalizeInput.resolved.bubbleId
    }),
    now: input.finalizeInput.now,
    envelope: {
      bubble_id: input.finalizeInput.resolved.bubbleId,
      sender: "orchestrator",
      recipient:
        input.finalizeInput.resolved.bubbleConfig.agents.implementer as AgentName,
      type: "APPROVAL_DECISION",
      // The resumed RUNNING state is already persisted on the next round,
      // so transcript authority must use that same round for later observation reconciliation.
      round: input.resumedWritten.state.round,
      payload: {
        decision: "rework",
        message: input.reworkMessage,
        metadata: {
          [deliveryTargetRoleMetadataKey]: "implementer",
          actor: "meta-reviewer",
          actor_agent: "codex",
          recommendation: input.runResultForRouting.recommendation,
          ...(input.runResultForRouting.run_id !== undefined
            ? { run_id: input.runResultForRouting.run_id }
            : {}),
          ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata)
        }
      },
      refs: input.finalizeInput.refs
    }
  });
}

async function writeHydratedAutoReworkState(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumedWritten: LoadedStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const hydratedMetaReview = incrementAutoReworkCount({
    ...input.resumedWritten.state,
    meta_review: normalizeMetaReviewSnapshot(input.resumedWritten.state.meta_review)
  }).meta_review;
  const hydratedResumed: BubbleStateSnapshot = {
    ...input.resumedWritten.state,
    meta_review: normalizeMetaReviewSnapshot(hydratedMetaReview)
  };

  return await input.finalizeInput.writeState(
    input.finalizeInput.resolved.bubblePaths.statePath,
    hydratedResumed,
    {
      expectedFingerprint: input.resumedWritten.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

function buildRestoredReadyState(input: {
  resumedState: BubbleStateSnapshot;
  loadedState: BubbleStateSnapshot;
  nowIso: string;
}): BubbleStateSnapshot {
  const restoredReady = applyStateTransition(input.resumedState, {
    to: "READY_FOR_HUMAN_APPROVAL",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });
  return {
    ...restoredReady,
    round: input.loadedState.round,
    round_role_history: input.loadedState.round_role_history,
    meta_review: normalizeMetaReviewSnapshot(restoredReady.meta_review)
  };
}

async function restoreReadyStateAfterAppendFailure(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumedWritten: LoadedStateSnapshot;
  nowIso: string;
}): Promise<LoadedStateSnapshot> {
  const restoredState = buildRestoredReadyState({
    resumedState: input.resumedWritten.state,
    loadedState: input.finalizeInput.loaded.state,
    nowIso: input.nowIso
  });

  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      restoredState,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (restoreError) {
    if (isNamedError(restoreError, "StateStoreConflictError")) {
      throw toGateConflictError(restoreError);
    }
    throw toGateTransitionError(restoreError);
  }
}

export async function dispatchAutoRework(
  input: DispatchAutoReworkInput
): Promise<MetaReviewGateResult> {
  const reworkMessage = input.runResultForRouting.rework_target_message;
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
      reworkMessage
    });
    const written = await writeHydratedAutoReworkState({
      finalizeInput: input.finalizeInput,
      resumedWritten
    });

    return {
      bubbleId: input.finalizeInput.resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: written.state,
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
