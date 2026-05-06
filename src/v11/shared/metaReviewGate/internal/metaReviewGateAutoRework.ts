import { applyStateTransition } from "../../../domain/state/machine.js";
import { assertValidBubbleStateSnapshot } from "../../state/stateSchema.js";
import { clearLiveMetaReviewSnapshot } from "../../metaReview/metaReviewSnapshot.js";
import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import { isNamedError } from "../../errors/namedError.js";
import type {
  AgentName,
  BubbleStateSnapshot
} from "../../../../types/bubble.js";
import type { Finding } from "../../../../types/findings.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";
import {
  buildGateLockPath,
  normalizeMetaReviewSnapshot,
  resolveFindingsParityMetadataForEnvelope
} from "./metaReviewGateShared.js";
import {
  incrementAutoReworkCount,
  setMetaReviewConsecutiveCleanRuns
} from "../../../domain/metaReviewGate/snapshotState.js";
import { MetaReviewGateError } from "../metaReviewGateRouteContract.js";
import type { MetaReviewGateResult } from "../metaReviewGateResultContract.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../../reviewPolicy/reviewPolicyRuntime.js";

interface AutoReworkFinalizeInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: AgentName;
        reviewer: AgentName;
        meta_reviewer: AgentName;
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
  findingsForPayload: Finding[] | undefined;
  reworkTargetMessage?: string;
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
  const streakResetState = setMetaReviewConsecutiveCleanRuns(
    finalizeInput.loaded.state,
    0
  );
  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: finalizeInput.loaded.state.bubble_id,
    currentRound: finalizeInput.loaded.state.round,
    roundRoleHistory: finalizeInput.loaded.state.round_role_history,
    implementer: finalizeInput.resolved.bubbleConfig.agents.implementer,
    reviewer: finalizeInput.resolved.bubbleConfig.agents.reviewer,
    nowIso,
    watchdogTimeoutMinutes:
      finalizeInput.resolved.bubbleConfig.watchdog_timeout_minutes
  });
  const resumedBase = assertValidBubbleStateSnapshot({
    ...streakResetState,
    state: "RUNNING",
    round: continuation.nextRound,
    active_agent: continuation.activeAgent,
    active_role: continuation.activeRole,
    execution_context: continuation.executionContext,
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history:
      continuation.appendRoundRoleEntry === undefined
        ? streakResetState.round_role_history
        : [
            ...streakResetState.round_role_history,
            continuation.appendRoundRoleEntry
          ],
    meta_review: clearLiveMetaReviewSnapshot(
      streakResetState.meta_review
    )
  });
  return {
    nowIso,
    resumed: assertValidBubbleStateSnapshot({
      ...resumedBase,
      meta_review: normalizeMetaReviewSnapshot(
        incrementAutoReworkCount(resumedBase).meta_review
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
  findingsForPayload: Finding[] | undefined;
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
      recipient: input.finalizeInput.resolved.bubbleConfig.agents.implementer,
      type: "APPROVAL_DECISION",
      // The resumed RUNNING state is already persisted on the next round,
      // so transcript authority must use that same round for later observation reconciliation.
      round: input.resumedWritten.state.round,
      payload: {
        decision: "rework",
        message: input.reworkMessage,
        ...(input.findingsForPayload !== undefined
          ? { findings: input.findingsForPayload }
          : {}),
        metadata: {
          [deliveryTargetRoleMetadataKey]: "implementer",
          actor: "meta-reviewer",
          actor_agent:
            input.finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
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
    meta_review: normalizeMetaReviewSnapshot(input.loadedState.meta_review)
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
