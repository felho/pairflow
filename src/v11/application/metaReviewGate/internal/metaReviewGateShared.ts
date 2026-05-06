import { join } from "node:path";

import type { BubbleStateSnapshot } from "../../../../types/bubble.js";
import { MetaReviewGateError } from "../../../shared/metaReviewGate/metaReviewGateRouteContract.js";

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
