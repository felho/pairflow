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
import {
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import {
  maybeRouteMetaReviewBeforeExpiry,
  maybeRouteMetaReviewOnExpiry
} from "./watchdogMetaReviewRouting.js";
import { maybeApplyPendingReworkIntent } from "./watchdogPendingReworkIntent.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
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

interface WatchdogRuntimeContext {
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

async function buildNotExpiredResult(
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

async function escalateRunningWatchdog(
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
  const context: WatchdogRuntimeContext = {
    now,
    nowIso,
    resolved,
    readState,
    recoverMetaReviewRoute,
    loadedState,
    state,
    emitDelivery,
    emitNotification
  };

  const pendingRework = await maybeApplyPendingReworkIntent({
    now: context.now,
    nowIso: context.nowIso,
    resolved: context.resolved,
    loadedState: context.loadedState,
    state: context.state,
    emitDelivery: context.emitDelivery
  });
  if (pendingRework !== null) {
    return pendingRework;
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
    const metaReviewNotExpired = await maybeRouteMetaReviewBeforeExpiry(context);
    if (metaReviewNotExpired !== null) {
      return metaReviewNotExpired;
    }
    return buildNotExpiredResult(context);
  }

  const metaReviewExpired = await maybeRouteMetaReviewOnExpiry(context);
  if (metaReviewExpired !== null) {
    return metaReviewExpired;
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

  return escalateRunningWatchdog(context);
}

export function asBubbleWatchdogError(error: unknown): never {
  return throwAsBubbleWatchdogError(error);
}
