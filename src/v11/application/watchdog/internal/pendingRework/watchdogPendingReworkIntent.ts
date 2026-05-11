import { emitBubbleLifecycleEventBestEffort } from "../../../metrics/bubbleEvents.js";
import { applyDeferredReworkIntent } from "../../../../domain/state/reworkIntent.js";
import { persistPendingReworkIntentState } from "./watchdogPendingReworkPersistence.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";
import type { BubbleWatchdogResult } from "../../watchdogCommandContract.js";
import type { ResolvedBubbleById } from "../../../../ports/bubbleLookup.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../../../ports/bubbleIdentity.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../../../ports/tmuxDelivery.js";

export async function maybeApplyPendingReworkIntent(input: {
  now: Date;
  nowIso: string;
  resolved: ResolvedBubbleById;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  writeState: WriteStateSnapshotPort;
  emitDelivery: EmitDeliveryNotificationAckPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
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
    recipientRole: "implementer",
    messageRef: input.resolveDeliveryMessageRef({
      bubbleId: input.resolved.bubbleId,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: deliveryEnvelope
    })
  });

  if (delivery.status !== "accepted") {
    return {
      bubbleId: input.resolved.bubbleId,
      escalated: false,
      reason: "rework_delivery_failed",
      state: input.state,
      intentId: pendingIntent.intent_id,
      deliveryError:
        `Pending rework intent delivery was not confirmed ` +
        `(reason: ${delivery.reason ?? "unknown"}, reason_code: ${delivery.reason_code ?? "unknown"}). ` +
        "Ensure runtime session is healthy, then rerun watchdog."
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

  const bubbleIdentity =
    await input.ensureBubbleInstanceIdForMutation({
    bubbleId: input.resolved.bubbleId,
    repoPath: input.resolved.repoPath,
    bubblePaths: input.resolved.bubblePaths,
    bubbleConfig: input.resolved.bubbleConfig,
    now: input.now
  });
  input.resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const written = await persistPendingReworkIntentState({
    statePath: input.resolved.bubblePaths.statePath,
    nextState: appliedTransition.state,
    loadedState: input.loadedState,
    intentId: pendingIntent.intent_id,
    writeStateSnapshot: input.writeState
  });

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
