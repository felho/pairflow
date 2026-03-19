import { join } from "node:path";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import { computeWatchdogStatus } from "../../../core/runtime/watchdog.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
  retryStuckAgentInput
} from "../../../core/runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { applyDeferredReworkIntent } from "../../../core/human/reworkIntent.js";
import {
  MetaReviewGateErrorV11 as MetaReviewGateError,
  recoverMetaReviewGateFromSnapshotV11 as recoverMetaReviewGateFromSnapshot
} from "../../application/metaReviewGate/emitMetaReviewGateV11.js";
import { hasCanonicalSubmitForActiveMetaReviewRound } from "../../../core/bubble/metaReview.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  BubbleWatchdogDependencies,
  BubbleWatchdogInput,
  BubbleWatchdogResult
} from "../../application/watchdog/watchdogCommandContract.js";
import {
  BubbleWatchdogError,
  throwAsBubbleWatchdogError
} from "./watchdogCommandRuntime.js";
export { BubbleWatchdogError } from "./watchdogCommandRuntime.js";

function buildEscalationQuestion(
  bubbleId: string,
  activeAgent: string,
  timeoutMinutes: number
): string {
  return `Watchdog timeout: no pairflow command from active agent ${activeAgent} within ${timeoutMinutes} minutes. Please intervene, then run pairflow bubble resume --id ${bubbleId} when ready.`;
}

function hasCanonicalMetaReviewSubmitInActiveWindow(
  state: BubbleStateSnapshot
): boolean {
  const snapshot = state.meta_review;
  if (snapshot === undefined) {
    return false;
  }
  return hasCanonicalSubmitForActiveMetaReviewRound({
    state,
    snapshot
  });
}

async function recoverMetaReviewRouteWithConflictGuard(input: {
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  summary: string;
  readState: typeof readStateSnapshot;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
}): Promise<{
  routed: Awaited<ReturnType<typeof recoverMetaReviewGateFromSnapshot>> | null;
  latestState: BubbleStateSnapshot | null;
}> {
  try {
    const routed = await input.recoverMetaReviewRoute({
      bubbleId: input.resolved.bubbleId,
      repoPath: input.resolved.repoPath,
      cwd: input.resolved.bubblePaths.worktreePath,
      now: input.now,
      summary: input.summary
    });
    return {
      routed,
      latestState: null
    };
  } catch (error) {
    if (
      !(error instanceof MetaReviewGateError) ||
      error.reasonCode !== "META_REVIEW_GATE_STATE_CONFLICT"
    ) {
      throw error;
    }
    const latest = await input.readState(input.resolved.bubblePaths.statePath);
    return {
      routed: null,
      latestState: latest.state
    };
  }
}

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput,
  dependencies: BubbleWatchdogDependencies = {}
): Promise<BubbleWatchdogResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const recoverMetaReviewRoute =
    dependencies.recoverMetaReviewGateFromSnapshot ?? recoverMetaReviewGateFromSnapshot;
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitNotification =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;

  if (state.state === "WAITING_HUMAN") {
    const pendingIntent = state.pending_rework_intent ?? null;
    if (pendingIntent !== null && pendingIntent.status === "pending") {
      const deliveryEnvelope: ProtocolEnvelope = {
        id: pendingIntent.intent_id,
        ts: nowIso,
        bubble_id: resolved.bubbleId,
        sender: "human",
        recipient: resolved.bubbleConfig.agents.implementer,
        type: "APPROVAL_DECISION",
        round: state.round,
        payload: {
          decision: "revise",
          message: pendingIntent.message
        },
        refs: [`rework-intent://${pendingIntent.intent_id}`]
      };

      const delivery = await emitDelivery({
        bubbleId: resolved.bubbleId,
        bubbleConfig: resolved.bubbleConfig,
        sessionsPath: resolved.bubblePaths.sessionsPath,
        envelope: deliveryEnvelope,
        messageRef: resolveDeliveryMessageRef({
          bubbleId: resolved.bubbleId,
          sessionsPath: resolved.bubblePaths.sessionsPath,
          envelope: deliveryEnvelope
        })
      });

      if (!delivery.delivered) {
        return {
          bubbleId: resolved.bubbleId,
          escalated: false,
          reason: "rework_delivery_failed",
          state,
          intentId: pendingIntent.intent_id,
          deliveryError: `Pending rework intent delivery was not confirmed (reason: ${delivery.reason ?? "unknown"}). Ensure runtime session is healthy, then rerun watchdog.`
        };
      }

      const appliedTransition = applyDeferredReworkIntent({
        state,
        implementer: resolved.bubbleConfig.agents.implementer,
        reviewer: resolved.bubbleConfig.agents.reviewer,
        now
      });
      if (appliedTransition === null) {
        return {
          bubbleId: resolved.bubbleId,
          escalated: false,
          reason: "not_monitored",
          state
        };
      }

      const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath,
        bubblePaths: resolved.bubblePaths,
        bubbleConfig: resolved.bubbleConfig,
        now
      });
      resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

      let written;
      try {
        written = await writeStateSnapshot(
          resolved.bubblePaths.statePath,
          appliedTransition.state,
          {
            expectedFingerprint: loadedState.fingerprint,
            expectedState: "WAITING_HUMAN"
          }
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new BubbleWatchdogError(
          `Pending rework intent ${pendingIntent.intent_id} delivery succeeded but state update failed. Root error: ${reason}`
        );
      }

      await emitBubbleLifecycleEventBestEffort({
        repoPath: resolved.repoPath,
        bubbleId: resolved.bubbleId,
        bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
        eventType: "rework_intent_applied",
        round: state.round,
        actorRole: "orchestrator",
        metadata: {
          intent_id: appliedTransition.intent.intent_id,
          requested_by: appliedTransition.intent.requested_by,
          requested_at: appliedTransition.intent.requested_at,
          state_at_request: "WAITING_HUMAN"
        },
        now
      });

      return {
        bubbleId: resolved.bubbleId,
        escalated: false,
        reason: "rework_intent_applied",
        state: written.state,
        intentId: appliedTransition.intent.intent_id
      };
    }
  }

  const watchdog = computeWatchdogStatus(
    state,
    resolved.bubbleConfig.watchdog_timeout_minutes,
    now
  );
  if (!watchdog.monitored) {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state
    };
  }

  if (!watchdog.expired) {
    if (state.state === "META_REVIEW_RUNNING") {
      if (!hasCanonicalMetaReviewSubmitInActiveWindow(state)) {
        return {
          bubbleId: resolved.bubbleId,
          escalated: false,
          reason: "not_expired",
          state
        };
      }

      const recovered = await recoverMetaReviewRouteWithConflictGuard({
        resolved,
        now,
        summary: "Meta-review submit detected; watchdog routed from canonical snapshot.",
        readState,
        recoverMetaReviewRoute
      });
      if (recovered.routed === null) {
        const latestState = recovered.latestState ?? state;
        return {
          bubbleId: resolved.bubbleId,
          escalated: false,
          reason: latestState.state === "META_REVIEW_RUNNING"
            ? "not_expired"
            : "state_not_running",
          state: latestState
        };
      }
      return {
        bubbleId: resolved.bubbleId,
        escalated: true,
        reason: "escalated",
        state: recovered.routed.state,
        envelope: recovered.routed.gateEnvelope,
        sequence: recovered.routed.gateSequence
      };
    }

    // Best-effort: if a pairflow message is stuck in the active agent's
    // input buffer (Enter didn't register during delivery), retry it now.
    let stuckRetried: boolean | undefined;
    if (state.state === "RUNNING" && state.active_agent !== null) {
      const retryResult = await retryStuckAgentInput({
        bubbleId: resolved.bubbleId,
        bubbleConfig: resolved.bubbleConfig,
        sessionsPath: resolved.bubblePaths.sessionsPath,
        activeAgent: state.active_agent
      }).catch(() => undefined);
      if (retryResult?.retried) {
        stuckRetried = true;
      }
    }
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "not_expired",
      state,
      stuckRetried
    };
  }

  if (state.state === "META_REVIEW_RUNNING") {
    const recovered = await recoverMetaReviewRouteWithConflictGuard({
      resolved,
      now,
      summary:
        `META_REVIEW_GATE_RUN_FAILED: timeout waiting for structured meta-review submit after ${resolved.bubbleConfig.watchdog_timeout_minutes} minutes.`,
      readState,
      recoverMetaReviewRoute
    });
    if (recovered.routed === null) {
      const latestState = recovered.latestState ?? state;
      return {
        bubbleId: resolved.bubbleId,
        escalated: false,
        reason: latestState.state === "META_REVIEW_RUNNING"
          ? "not_expired"
          : "state_not_running",
        state: latestState
      };
    }
    return {
      bubbleId: resolved.bubbleId,
      escalated: true,
      reason: "escalated",
      state: recovered.routed.state,
      envelope: recovered.routed.gateEnvelope,
      sequence: recovered.routed.gateSequence
    };
  }

  if (state.state !== "RUNNING") {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "state_not_running",
      state
    };
  }

  if (state.active_agent === null) {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state
    };
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const appended = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    mirrorPaths: [resolved.bubblePaths.inboxPath],
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: state.round,
      payload: {
        question: buildEscalationQuestion(
          resolved.bubbleId,
          state.active_agent,
          resolved.bubbleConfig.watchdog_timeout_minutes
        )
      },
      refs: []
    }
  });

  const nextState = applyStateTransition(state, {
    to: "WAITING_HUMAN",
    lastCommandAt: nowIso
  });

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleWatchdogError(
      `Watchdog escalation envelope ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitDelivery({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: resolved.bubbleId,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope
    })
  });
  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitNotification(resolved.bubbleConfig, "waiting-human");

  return {
    bubbleId: resolved.bubbleId,
    escalated: true,
    reason: "escalated",
    state: written.state,
    envelope: appended.envelope,
    sequence: appended.sequence
  };
}

export function asBubbleWatchdogError(error: unknown): never {
  return throwAsBubbleWatchdogError(error);
}
