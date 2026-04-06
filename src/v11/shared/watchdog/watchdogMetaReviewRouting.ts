import { resolveDeliveryMessageRef } from "../../../core/runtime/tmuxDelivery.js";
import {
  MetaReviewGateError
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import type { recoverMetaReviewGateFromSnapshot } from "../metaReviewGate/metaReviewGateCommandApi.js";
import type { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "../../application/watchdog/watchdogCommandContract.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { SchemaValidationError } from "../../../core/validation.js";
import {
  isMetaReviewExecutionContextActiveState,
  validateActiveMetaReviewExecutionContext
} from "../../../core/bubble/metaReviewExecutionContext.js";

function assertMetaReviewExecutionContext(state: BubbleStateSnapshot): void {
  const result = validateActiveMetaReviewExecutionContext(state);
  if (result.ok) {
    return;
  }
  throw new SchemaValidationError(
    "Invalid active meta-review execution context",
    result.errors
  );
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
      reason: isMetaReviewExecutionContextActiveState(latestState)
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

function emitRecoveredMetaReviewDelivery(input: {
  bubbleId: string;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  envelope: NonNullable<BubbleWatchdogResult["envelope"]>;
  emitDelivery: typeof emitTmuxDeliveryNotification;
}): void {
  void input.emitDelivery({
    bubbleId: input.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: input.bubbleId,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: input.envelope
    })
  });
}

export function maybeRouteMetaReviewBeforeExpiry(input: {
  state: BubbleStateSnapshot;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  readState: typeof readStateSnapshot;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
  emitDelivery: typeof emitTmuxDeliveryNotification;
}): BubbleWatchdogResult | null {
  if (!isMetaReviewExecutionContextActiveState(input.state)) {
    return null;
  }
  assertMetaReviewExecutionContext(input.state);
  return {
    bubbleId: input.resolved.bubbleId,
    escalated: false,
    reason: "not_expired",
    state: input.state
  };
}

export async function maybeRouteMetaReviewOnExpiry(input: {
  state: BubbleStateSnapshot;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  readState: typeof readStateSnapshot;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
  emitDelivery: typeof emitTmuxDeliveryNotification;
}): Promise<BubbleWatchdogResult | null> {
  if (!isMetaReviewExecutionContextActiveState(input.state)) {
    return null;
  }
  assertMetaReviewExecutionContext(input.state);
  const recovered = await recoverMetaReviewRouteWithConflictGuard({
    resolved: input.resolved,
    now: input.now,
    summary:
      `META_REVIEW_GATE_RUN_FAILED: timeout waiting for structured meta-review submit after ${input.resolved.bubbleConfig.watchdog_timeout_minutes} minutes.`,
    readState: input.readState,
    recoverMetaReviewRoute: input.recoverMetaReviewRoute
  });
  const mapped = mapRecoveredMetaReviewResult({
    bubbleId: input.resolved.bubbleId,
    fallbackState: input.state,
    recovered
  });
  if (mapped.escalated && mapped.envelope !== undefined) {
    emitRecoveredMetaReviewDelivery({
      bubbleId: input.resolved.bubbleId,
      resolved: input.resolved,
      envelope: mapped.envelope,
      emitDelivery: input.emitDelivery
    });
  }
  return mapped;
}
