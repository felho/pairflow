import { retryStuckAgentInput, resolveDeliveryMessageRef } from "../../../core/runtime/tmuxDelivery.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "./watchdogCommandContract.js";
import { executeWatchdogEscalationMutation } from "../../shared/watchdog/watchdogEscalationMutation.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { recoverMetaReviewGateFromSnapshot } from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
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
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  readState: ReadStateSnapshotPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  emitDelivery: typeof emitTmuxDeliveryNotification;
  emitNotification: typeof emitBubbleNotification;
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
