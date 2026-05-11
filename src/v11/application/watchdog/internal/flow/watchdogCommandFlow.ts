import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import type { BubbleWatchdogResult } from "../../watchdogCommandContract.js";
import { deriveWatchdogWaitingHumanState } from "../../../../domain/state/watchdogEscalation.js";
import { clearLiveMetaReviewSnapshot } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import { assertValidBubbleStateSnapshot } from "../../../../domain/state/stateSchema.js";
import type { ResolvedBubbleById } from "../../../../ports/bubbleLookup.js";
import type { EmitBubbleNotificationPort } from "../../../../ports/notifications.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort,
  RetryStuckAgentInputPort
} from "../../../../ports/tmuxDelivery.js";
import type {
  AppendProtocolEnvelopePort
} from "../../../../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import { BubbleWatchdogError } from "../error/watchdogCommandRuntime.js";

function buildEscalationQuestion(
  bubbleId: string,
  activeAgent: string,
  timeoutMinutes: number
): string {
  return `Watchdog timeout: no pairflow command from active agent ${activeAgent} within ${timeoutMinutes} minutes. Please intervene, then run pairflow bubble resume --id ${bubbleId} when ready.`;
}

function ignoreBestEffortFailure(promise: Promise<unknown>): void {
  void promise.catch(() => undefined);
}

export interface WatchdogRuntimeContext {
  now: Date;
  nowIso: string;
  resolved: ResolvedBubbleById;
  readState: ReadStateSnapshotPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  emitDelivery: EmitDeliveryNotificationAckPort;
  emitNotification: EmitBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  retryStuckAgentInput: RetryStuckAgentInputPort;
}

export async function maybeRetryStuckAgentInput(
  context: WatchdogRuntimeContext
): Promise<boolean> {
  // Best-effort: if a pairflow message is stuck in the active role's
  // input buffer (Enter didn't register during delivery), retry it now.
  if (context.state.state === "RUNNING" && context.state.active_role !== null) {
    let retryResult:
      | Awaited<ReturnType<WatchdogRuntimeContext["retryStuckAgentInput"]>>
      | undefined;
    try {
      retryResult = await context.retryStuckAgentInput({
        bubbleId: context.resolved.bubbleId,
        bubbleConfig: context.resolved.bubbleConfig,
        sessionsPath: context.resolved.bubblePaths.sessionsPath,
        activeRole: context.state.active_role
      });
    } catch (error) {
      if (error instanceof BubbleWatchdogError) {
        throw error;
      }
      // Retry remains a best-effort delivery recovery path. Generic tmux/runtime
      // faults must not mutate watchdog state or block the canonical route.
    }
    if (retryResult?.retried) {
      return true;
    }
  }
  return false;
}

export async function buildNotExpiredResult(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult> {
  const stuckRetried = await maybeRetryStuckAgentInput(context);
  return {
    bubbleId: context.resolved.bubbleId,
    escalated: false,
    reason: "not_expired",
    state: context.state,
    stuckRetried: stuckRetried ? true : undefined
  };
}

export async function escalateRunningWatchdog(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult> {
  const appended = await context.appendEnvelope({
    transcriptPath: context.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [context.resolved.bubblePaths.inboxPath],
    lockPath: `${context.resolved.bubblePaths.locksDir}/${context.resolved.bubbleId}.lock`,
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

  const nextState = deriveWatchdogWaitingHumanState({
    state: context.state,
    lastCommandAt: context.nowIso
  });

  let written: LoadedStateSnapshot;
  try {
    written = await context.writeState(
      context.resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: context.loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleWatchdogError(
      `Watchdog escalation envelope ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  // Optional UX signal; never block protocol/state progression on notification failure.
  ignoreBestEffortFailure(
    context.emitDelivery({
      bubbleId: context.resolved.bubbleId,
      bubbleConfig: context.resolved.bubbleConfig,
      sessionsPath: context.resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope,
      recipientRole: "status",
      messageRef: context.resolveDeliveryMessageRef({
        bubbleId: context.resolved.bubbleId,
        sessionsPath: context.resolved.bubblePaths.sessionsPath,
        envelope: appended.envelope
      })
    })
  );
  // Optional UX signal; never block protocol/state progression on notification failure.
  ignoreBestEffortFailure(
    context.emitNotification(context.resolved.bubbleConfig, "waiting-human")
  );

  return {
    bubbleId: context.resolved.bubbleId,
    escalated: true,
    reason: "escalated",
    state: written.state,
    envelope: appended.envelope,
    sequence: appended.sequence
  };
}

export async function escalateMetaReviewWatchdog(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult> {
  const question =
    `Watchdog timeout: meta-review submit did not complete within ${context.resolved.bubbleConfig.watchdog_timeout_minutes} minutes. ` +
    `Please intervene and restart or re-run meta-review for bubble ${context.resolved.bubbleId}.`;
  const appended = await context.appendEnvelope({
    transcriptPath: context.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [context.resolved.bubblePaths.inboxPath],
    lockPath: `${context.resolved.bubblePaths.locksDir}/${context.resolved.bubbleId}.lock`,
    now: context.now,
    envelope: {
      bubble_id: context.resolved.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: context.state.round,
      payload: {
        question
      },
      refs: []
    }
  });

  const nextState = assertValidBubbleStateSnapshot({
    ...context.state,
    state: "WAITING_HUMAN",
    execution_context: null,
    last_command_at: context.nowIso,
    meta_review: clearLiveMetaReviewSnapshot(context.state.meta_review)
  });
  const written = await context.writeState(
    context.resolved.bubblePaths.statePath,
    nextState,
    {
      expectedFingerprint: context.loadedState.fingerprint,
      expectedState: "RUNNING"
    }
  );

  ignoreBestEffortFailure(
    context.emitDelivery({
      bubbleId: context.resolved.bubbleId,
      bubbleConfig: context.resolved.bubbleConfig,
      sessionsPath: context.resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope,
      recipientRole: "status",
      messageRef: context.resolveDeliveryMessageRef({
        bubbleId: context.resolved.bubbleId,
        sessionsPath: context.resolved.bubblePaths.sessionsPath,
        envelope: appended.envelope
      })
    })
  );
  ignoreBestEffortFailure(
    context.emitNotification(context.resolved.bubbleConfig, "waiting-human")
  );

  return {
    bubbleId: context.resolved.bubbleId,
    escalated: true,
    reason: "escalated",
    state: written.state,
    envelope: appended.envelope,
    sequence: appended.sequence
  };
}
