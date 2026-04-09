import { resolveDeliveryMessageRef } from "../../../core/runtime/tmuxDelivery.js";
import {
  MetaReviewGateError
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type { recoverMetaReviewGateFromSnapshot } from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "./watchdogCommandContract.js";
import type { ResolvedBubbleById } from "../../shared/ports/bubbleLookup.js";
import type { ReadStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type { EmitTmuxDeliveryNotificationPort } from "../../shared/ports/tmuxDelivery.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import {
  isMetaReviewExecutionContextActiveState,
  validateActiveMetaReviewExecutionContext
} from "../../shared/metaReview/metaReviewExecutionContext.js";

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
  resolved: ResolvedBubbleById;
  now: Date;
  summary: string;
  readState: ReadStateSnapshotPort;
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
  resolved: ResolvedBubbleById;
  envelope: NonNullable<BubbleWatchdogResult["envelope"]>;
  emitDelivery: EmitTmuxDeliveryNotificationPort;
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
  resolved: ResolvedBubbleById;
  now: Date;
  readState: ReadStateSnapshotPort;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
  emitDelivery: EmitTmuxDeliveryNotificationPort;
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
  resolved: ResolvedBubbleById;
  now: Date;
  readState: ReadStateSnapshotPort;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
  emitDelivery: EmitTmuxDeliveryNotificationPort;
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
