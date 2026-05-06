import { join } from "node:path";

import type { BubbleStateSnapshot } from "../../../../types/bubble.js";
import { MetaReviewGateError } from "../metaReviewGateRouteContract.js";

export const metaReviewGateStagedReadyRestoreAppliedReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_APPLIED";
export const metaReviewGateStagedReadyRestoreStateConflictReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_STATE_CONFLICT";
export const metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_TRANSITION_INVALID";
export const metaReviewGatePaneDeactivationUnavoidableReasonCode =
  "META_REVIEW_GATE_PANE_DEACTIVATION_UNAVOIDABLE";

export function toConflictError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${reason}`
  );
}

export function toTransitionError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${reason}`
  );
}

export function assertRunningConvergenceState(state: BubbleStateSnapshot): void {
  if (state.state !== "RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate convergence route requires RUNNING state (current: ${state.state}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
}

export function buildGateLockPath(paths: { locksDir: string; bubbleId: string }): string {
  return join(paths.locksDir, `${paths.bubbleId}.lock`);
}
