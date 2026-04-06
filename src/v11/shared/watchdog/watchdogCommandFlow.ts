import { join } from "node:path";

import { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { retryStuckAgentInput, resolveDeliveryMessageRef } from "../../../core/runtime/tmuxDelivery.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "../../application/watchdog/watchdogCommandContract.js";
import type { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { BubbleWatchdogError } from "./watchdogCommandRuntime.js";
import type { recoverMetaReviewGateFromSnapshot } from "../metaReviewGate/metaReviewGateCommandApi.js";

export interface WatchdogRuntimeContext {
  now: Date;
  nowIso: string;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  readState: typeof readStateSnapshot;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
  loadedState: Awaited<ReturnType<typeof readStateSnapshot>>;
  state: BubbleStateSnapshot;
  emitDelivery: typeof emitTmuxDeliveryNotification;
  emitNotification: typeof emitBubbleNotification;
}

function buildEscalationQuestion(
  bubbleId: string,
  activeAgent: string,
  timeoutMinutes: number
): string {
  return `Watchdog timeout: no pairflow command from active agent ${activeAgent} within ${timeoutMinutes} minutes. Please intervene, then run pairflow bubble resume --id ${bubbleId} when ready.`;
}

export async function buildNotExpiredResult(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult> {
  // Best-effort: if a pairflow message is stuck in the active agent's
  // input buffer (Enter didn't register during delivery), retry it now.
  let stuckRetried: boolean | undefined;
  if (context.state.state === "RUNNING" && context.state.active_agent !== null) {
    const retryResult = await retryStuckAgentInput({
      bubbleId: context.resolved.bubbleId,
      bubbleConfig: context.resolved.bubbleConfig,
      sessionsPath: context.resolved.bubblePaths.sessionsPath,
      activeAgent: context.state.active_agent
    }).catch(() => undefined);
    if (retryResult?.retried) {
      stuckRetried = true;
    }
  }
  return {
    bubbleId: context.resolved.bubbleId,
    escalated: false,
    reason: "not_expired",
    state: context.state,
    stuckRetried
  };
}

export async function escalateRunningWatchdog(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult> {
  const lockPath = join(context.resolved.bubblePaths.locksDir, `${context.resolved.bubbleId}.lock`);
  const appended = await appendProtocolEnvelope({
    transcriptPath: context.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [context.resolved.bubblePaths.inboxPath],
    lockPath,
    now: context.now,
    envelope: {
      bubble_id: context.resolved.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: context.state.round,
      payload: {
        question: buildEscalationQuestion(
          context.resolved.bubbleId,
          context.state.active_agent ?? "unknown",
          context.resolved.bubbleConfig.watchdog_timeout_minutes
        )
      },
      refs: []
    }
  });

  const nextState = applyStateTransition(context.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: context.nowIso
  });

  let written;
  try {
    written = await writeStateSnapshot(context.resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: context.loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleWatchdogError(
      `Watchdog escalation envelope ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  // Optional UX signal; never block protocol/state progression on notification failure.
  void context.emitDelivery({
    bubbleId: context.resolved.bubbleId,
    bubbleConfig: context.resolved.bubbleConfig,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: context.resolved.bubbleId,
      sessionsPath: context.resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope
    })
  });
  // Optional UX signal; never block protocol/state progression on notification failure.
  void context.emitNotification(context.resolved.bubbleConfig, "waiting-human");

  return {
    bubbleId: context.resolved.bubbleId,
    escalated: true,
    reason: "escalated",
    state: written.state,
    envelope: appended.envelope,
    sequence: appended.sequence
  };
}
