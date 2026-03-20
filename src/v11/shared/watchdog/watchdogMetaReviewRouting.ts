import { hasCanonicalSubmitForActiveMetaReviewRound } from "../../../core/bubble/metaReview.js";
import {
  MetaReviewGateError
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import type { recoverMetaReviewGateFromSnapshot } from "../metaReviewGate/metaReviewGateCommandApi.js";
import type { readStateSnapshot } from "../../../core/state/stateStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "../../application/watchdog/watchdogCommandContract.js";

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

export async function maybeRouteMetaReviewBeforeExpiry(input: {
  state: BubbleStateSnapshot;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  readState: typeof readStateSnapshot;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
}): Promise<BubbleWatchdogResult | null> {
  if (input.state.state !== "META_REVIEW_RUNNING") {
    return null;
  }
  if (!hasCanonicalMetaReviewSubmitInActiveWindow(input.state)) {
    return {
      bubbleId: input.resolved.bubbleId,
      escalated: false,
      reason: "not_expired",
      state: input.state
    };
  }

  const recovered = await recoverMetaReviewRouteWithConflictGuard({
    resolved: input.resolved,
    now: input.now,
    summary: "Meta-review submit detected; watchdog routed from canonical snapshot.",
    readState: input.readState,
    recoverMetaReviewRoute: input.recoverMetaReviewRoute
  });
  return mapRecoveredMetaReviewResult({
    bubbleId: input.resolved.bubbleId,
    fallbackState: input.state,
    recovered
  });
}

export async function maybeRouteMetaReviewOnExpiry(input: {
  state: BubbleStateSnapshot;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  readState: typeof readStateSnapshot;
  recoverMetaReviewRoute: typeof recoverMetaReviewGateFromSnapshot;
}): Promise<BubbleWatchdogResult | null> {
  if (input.state.state !== "META_REVIEW_RUNNING") {
    return null;
  }
  const recovered = await recoverMetaReviewRouteWithConflictGuard({
    resolved: input.resolved,
    now: input.now,
    summary:
      `META_REVIEW_GATE_RUN_FAILED: timeout waiting for structured meta-review submit after ${input.resolved.bubbleConfig.watchdog_timeout_minutes} minutes.`,
    readState: input.readState,
    recoverMetaReviewRoute: input.recoverMetaReviewRoute
  });
  return mapRecoveredMetaReviewResult({
    bubbleId: input.resolved.bubbleId,
    fallbackState: input.state,
    recovered
  });
}
