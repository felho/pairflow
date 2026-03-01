import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { computeWatchdogStatus } from "../runtime/watchdog.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import { emitTmuxDeliveryNotification, retryStuckAgentInput } from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { applyDeferredReworkIntent } from "../human/reworkIntent.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface BubbleWatchdogInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export type BubbleWatchdogNoopReason =
  | "not_monitored"
  | "not_expired"
  | "state_not_running"
  | "rework_intent_applied"
  | "rework_delivery_failed";

export interface BubbleWatchdogResult {
  bubbleId: string;
  escalated: boolean;
  reason: BubbleWatchdogNoopReason | "escalated";
  state: BubbleStateSnapshot;
  envelope?: ProtocolEnvelope | undefined;
  sequence?: number | undefined;
  stuckRetried?: boolean | undefined;
  intentId?: string | undefined;
  deliveryError?: string | undefined;
}

export class BubbleWatchdogError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleWatchdogError";
  }
}

function buildEscalationQuestion(
  bubbleId: string,
  activeAgent: string,
  timeoutMinutes: number
): string {
  return `Watchdog timeout: no pairflow command from active agent ${activeAgent} within ${timeoutMinutes} minutes. Please intervene, then run pairflow bubble resume --id ${bubbleId} when ready.`;
}

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput
): Promise<BubbleWatchdogResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

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

      const delivery = await emitTmuxDeliveryNotification({
        bubbleId: resolved.bubbleId,
        bubbleConfig: resolved.bubbleConfig,
        sessionsPath: resolved.bubblePaths.sessionsPath,
        envelope: deliveryEnvelope,
        messageRef: `rework-intent://${pendingIntent.intent_id}`
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
  void emitTmuxDeliveryNotification({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });
  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitBubbleNotification(resolved.bubbleConfig, "waiting-human");

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
  if (error instanceof BubbleWatchdogError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleWatchdogError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleWatchdogError(error.message);
  }
  throw error;
}
