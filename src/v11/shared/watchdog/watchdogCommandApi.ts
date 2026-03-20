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
  MetaReviewGateError,
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateCommandApi.js";
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

function mapRecoveredMetaReviewResult(input: {
  bubbleId: string;
  fallbackState: BubbleStateSnapshot;
  recovered: Awaited<ReturnType<typeof recoverMetaReviewRouteWithConflictGuard>>;
}): BubbleWatchdogResult {
  if (input.recovered.routed === null) {
    const latestState = input.recovered.latestState ?? input.fallbackState;
    return {
      bubbleId: input.bubbleId,
      escalated: false,
      reason: latestState.state === "META_REVIEW_RUNNING"
        ? "not_expired"
        : "state_not_running",
      state: latestState
    };
  }
  return {
    bubbleId: input.bubbleId,
    escalated: true,
    reason: "escalated",
    state: input.recovered.routed.state,
    envelope: input.recovered.routed.gateEnvelope,
    sequence: input.recovered.routed.gateSequence
  };
}

async function maybeApplyPendingReworkIntent(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult | null> {
  if (context.state.state !== "WAITING_HUMAN") {
    return null;
  }
  const pendingIntent = context.state.pending_rework_intent ?? null;
  if (pendingIntent === null || pendingIntent.status !== "pending") {
    return null;
  }

  const deliveryEnvelope: ProtocolEnvelope = {
    id: pendingIntent.intent_id,
    ts: context.nowIso,
    bubble_id: context.resolved.bubbleId,
    sender: "human",
    recipient: context.resolved.bubbleConfig.agents.implementer,
    type: "APPROVAL_DECISION",
    round: context.state.round,
    payload: {
      decision: "revise",
      message: pendingIntent.message
    },
    refs: [`rework-intent://${pendingIntent.intent_id}`]
  };

  const delivery = await context.emitDelivery({
    bubbleId: context.resolved.bubbleId,
    bubbleConfig: context.resolved.bubbleConfig,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    envelope: deliveryEnvelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: context.resolved.bubbleId,
      sessionsPath: context.resolved.bubblePaths.sessionsPath,
      envelope: deliveryEnvelope
    })
  });

  if (!delivery.delivered) {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "rework_delivery_failed",
      state: context.state,
      intentId: pendingIntent.intent_id,
      deliveryError: `Pending rework intent delivery was not confirmed (reason: ${delivery.reason ?? "unknown"}). Ensure runtime session is healthy, then rerun watchdog.`
    };
  }

  const appliedTransition = applyDeferredReworkIntent({
    state: context.state,
    implementer: context.resolved.bubbleConfig.agents.implementer,
    reviewer: context.resolved.bubbleConfig.agents.reviewer,
    now: context.now
  });
  if (appliedTransition === null) {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state: context.state
    };
  }

  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: context.resolved.bubbleId,
    repoPath: context.resolved.repoPath,
    bubblePaths: context.resolved.bubblePaths,
    bubbleConfig: context.resolved.bubbleConfig,
    now: context.now
  });
  context.resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  let written;
  try {
    written = await writeStateSnapshot(
      context.resolved.bubblePaths.statePath,
      appliedTransition.state,
      {
        expectedFingerprint: context.loadedState.fingerprint,
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
    repoPath: context.resolved.repoPath,
    bubbleId: context.resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "rework_intent_applied",
    round: context.state.round,
    actorRole: "orchestrator",
    metadata: {
      intent_id: appliedTransition.intent.intent_id,
      requested_by: appliedTransition.intent.requested_by,
      requested_at: appliedTransition.intent.requested_at,
      state_at_request: "WAITING_HUMAN"
    },
    now: context.now
  });

  return {
    bubbleId: context.resolved.bubbleId,
    escalated: false,
    reason: "rework_intent_applied",
    state: written.state,
    intentId: appliedTransition.intent.intent_id
  };
}

async function maybeRouteMetaReviewBeforeExpiry(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult | null> {
  if (context.state.state !== "META_REVIEW_RUNNING") {
    return null;
  }
  if (!hasCanonicalMetaReviewSubmitInActiveWindow(context.state)) {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "not_expired",
      state: context.state
    };
  }

  const recovered = await recoverMetaReviewRouteWithConflictGuard({
    resolved: context.resolved,
    now: context.now,
    summary: "Meta-review submit detected; watchdog routed from canonical snapshot.",
    readState: context.readState,
    recoverMetaReviewRoute: context.recoverMetaReviewRoute
  });
  return mapRecoveredMetaReviewResult({
    bubbleId: context.resolved.bubbleId,
    fallbackState: context.state,
    recovered
  });
}

async function maybeRouteMetaReviewOnExpiry(
  context: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult | null> {
  if (context.state.state !== "META_REVIEW_RUNNING") {
    return null;
  }
  const recovered = await recoverMetaReviewRouteWithConflictGuard({
    resolved: context.resolved,
    now: context.now,
    summary:
      `META_REVIEW_GATE_RUN_FAILED: timeout waiting for structured meta-review submit after ${context.resolved.bubbleConfig.watchdog_timeout_minutes} minutes.`,
    readState: context.readState,
    recoverMetaReviewRoute: context.recoverMetaReviewRoute
  });
  return mapRecoveredMetaReviewResult({
    bubbleId: context.resolved.bubbleId,
    fallbackState: context.state,
    recovered
  });
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

  const pendingRework = await maybeApplyPendingReworkIntent(context);
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
