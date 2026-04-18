import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "./watchdogCommandContract.js";
import { executeWatchdogEscalationMutation } from "../../shared/watchdog/watchdogEscalationMutation.js";
import { clearLiveMetaReviewSnapshot } from "../../shared/metaReview/metaReviewSnapshot.js";
import { assertValidBubbleStateSnapshot } from "../../shared/state/stateSchema.js";
import type { ResolvedBubbleById } from "../../shared/ports/bubbleLookup.js";
import type { EmitBubbleNotificationPort } from "../../shared/ports/notifications.js";
import type {
  EmitDeliveryAckLikePort,
  ResolveDeliveryMessageRefPort,
  RetryStuckAgentInputPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  AppendProtocolEnvelopePort
} from "../../shared/ports/transcript.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";

export interface WatchdogRuntimeContext {
  now: Date;
  nowIso: string;
  resolved: ResolvedBubbleById;
  readState: ReadStateSnapshotPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  emitDelivery: EmitDeliveryAckLikePort;
  emitNotification: EmitBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  retryStuckAgentInput: RetryStuckAgentInputPort;
}

export async function buildNotExpiredResult(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult> {
  // Best-effort: if a pairflow message is stuck in the active agent's
  // input buffer (Enter didn't register during delivery), retry it now.
  let stuckRetried: boolean | undefined;
  if (context.state.state === "RUNNING" && context.state.active_agent !== null) {
    const retryResult = await context.retryStuckAgentInput({
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
  const { appended, written } = await executeWatchdogEscalationMutation({
    bubbleId: context.resolved.bubbleId,
    bubbleConfig: context.resolved.bubbleConfig,
    bubblePaths: {
      inboxPath: context.resolved.bubblePaths.inboxPath,
      locksDir: context.resolved.bubblePaths.locksDir,
      statePath: context.resolved.bubblePaths.statePath,
      transcriptPath: context.resolved.bubblePaths.transcriptPath
    },
    state: context.state,
    loadedState: context.loadedState,
    now: context.now,
    nowIso: context.nowIso,
    appendProtocolEnvelope: context.appendEnvelope,
    writeStateSnapshot: context.writeState
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void context.emitDelivery({
    bubbleId: context.resolved.bubbleId,
    bubbleConfig: context.resolved.bubbleConfig,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef: context.resolveDeliveryMessageRef({
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

  void context.emitDelivery({
    bubbleId: context.resolved.bubbleId,
    bubbleConfig: context.resolved.bubbleConfig,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef: context.resolveDeliveryMessageRef({
      bubbleId: context.resolved.bubbleId,
      sessionsPath: context.resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope
    })
  });
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
