import { writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import {
  resolveDeliveryMessageRef,
  type emitTmuxDeliveryNotification
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { applyDeferredReworkIntent } from "../../../core/human/reworkIntent.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { BubbleWatchdogResult } from "../../application/watchdog/watchdogCommandContract.js";
import { BubbleWatchdogError } from "./watchdogCommandRuntime.js";

export async function maybeApplyPendingReworkIntent(input: {
  now: Date;
  nowIso: string;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  loadedState: Awaited<ReturnType<typeof readStateSnapshot>>;
  state: BubbleStateSnapshot;
  emitDelivery: typeof emitTmuxDeliveryNotification;
}): Promise<BubbleWatchdogResult | null> {
  if (input.state.state !== "WAITING_HUMAN") {
    return null;
  }
  const pendingIntent = input.state.pending_rework_intent ?? null;
  if (pendingIntent === null || pendingIntent.status !== "pending") {
    return null;
  }

  const deliveryEnvelope: ProtocolEnvelope = {
    id: pendingIntent.intent_id,
    ts: input.nowIso,
    bubble_id: input.resolved.bubbleId,
    sender: "human",
    recipient: input.resolved.bubbleConfig.agents.implementer,
    type: "APPROVAL_DECISION",
    round: input.state.round,
    payload: {
      decision: "rework",
      message: pendingIntent.message
    },
    refs: [`rework-intent://${pendingIntent.intent_id}`]
  };

  const delivery = await input.emitDelivery({
    bubbleId: input.resolved.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: deliveryEnvelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: input.resolved.bubbleId,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: deliveryEnvelope
    })
  });

  if (!delivery.delivered) {
    return {
      bubbleId: input.resolved.bubbleId,
      escalated: false,
      reason: "rework_delivery_failed",
      state: input.state,
      intentId: pendingIntent.intent_id,
      deliveryError: `Pending rework intent delivery was not confirmed (reason: ${delivery.reason ?? "unknown"}). Ensure runtime session is healthy, then rerun watchdog.`
    };
  }

  const appliedTransition = applyDeferredReworkIntent({
    state: input.state,
    implementer: input.resolved.bubbleConfig.agents.implementer,
    reviewer: input.resolved.bubbleConfig.agents.reviewer,
    watchdogTimeoutMinutes: input.resolved.bubbleConfig.watchdog_timeout_minutes,
    now: input.now
  });
  if (appliedTransition === null) {
    return {
      bubbleId: input.resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state: input.state
    };
  }

  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: input.resolved.bubbleId,
    repoPath: input.resolved.repoPath,
    bubblePaths: input.resolved.bubblePaths,
    bubbleConfig: input.resolved.bubbleConfig,
    now: input.now
  });
  input.resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  let written;
  try {
    written = await writeStateSnapshot(
      input.resolved.bubblePaths.statePath,
      appliedTransition.state,
      {
        expectedFingerprint: input.loadedState.fingerprint,
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
    repoPath: input.resolved.repoPath,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "rework_intent_applied",
    round: input.state.round,
    actorRole: "orchestrator",
    metadata: {
      intent_id: appliedTransition.intent.intent_id,
      requested_by: appliedTransition.intent.requested_by,
      requested_at: appliedTransition.intent.requested_at,
      state_at_request: "WAITING_HUMAN"
    },
    now: input.now
  });

  return {
    bubbleId: input.resolved.bubbleId,
    escalated: false,
    reason: "rework_intent_applied",
    state: written.state,
    intentId: appliedTransition.intent.intent_id
  };
}
