import { applyStateTransition } from "../../../domain/state/machine.js";
import { assertValidBubbleStateSnapshot } from "../../state/stateSchema.js";
import type { BubbleStateSnapshot } from "../../../../types/bubble.js";
import {
  normalizeMetaReviewSnapshot
} from "./metaReviewGateSnapshotHelpers.js";
import { clearLiveMetaReviewSnapshot } from "../../metaReview/metaReviewSnapshot.js";
export {
  buildHumanGateSummary,
  normalizeMetaReviewSnapshot,
  resolveMetaReviewerAgent,
  resolveFindingsParityMetadataForEnvelope
} from "./metaReviewGateSnapshotHelpers.js";
export {
  metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode,
  resolveAutoReworkRetryInvariantViolation
} from "../../../domain/metaReviewGate/autoReworkRetryInvariant.js";
export {
  resolveDefaultStickyHumanGateForRoute,
  resolveHumanGateRoute
} from "../../../domain/metaReviewGate/humanGateRouting.js";

export function transitionToGateState(input: {
  current: BubbleStateSnapshot;
  nowIso: string;
  targetState: "READY_FOR_HUMAN_APPROVAL" | "RUNNING";
  stickyHumanGate: boolean;
  consecutiveCleanRuns?: number;
}): BubbleStateSnapshot {
  const transitioned =
    input.current.state === input.targetState
      ? assertValidBubbleStateSnapshot({
          ...input.current,
          ...(input.targetState === "READY_FOR_HUMAN_APPROVAL"
            ? {
                active_agent: null,
                active_role: null,
                active_since: null,
                execution_context: null
              }
            : {}),
          last_command_at: input.nowIso,
          meta_review: clearLiveMetaReviewSnapshot(input.current.meta_review)
        })
      : applyStateTransition(input.current, {
          to: input.targetState,
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: input.nowIso
        });

  const metaReview = clearLiveMetaReviewSnapshot(transitioned.meta_review);
  return {
    ...transitioned,
    meta_review: {
      ...metaReview,
      sticky_human_gate: input.stickyHumanGate,
      ...(input.consecutiveCleanRuns !== undefined
        ? { consecutive_clean_runs: input.consecutiveCleanRuns }
        : {})
    }
  };
}

export function incrementAutoReworkCount(input: BubbleStateSnapshot): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      auto_rework_count: metaReview.auto_rework_count + 1
    }
  };
}

export function setMetaReviewConsecutiveCleanRuns(
  input: BubbleStateSnapshot,
  consecutiveCleanRuns: number
): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      consecutive_clean_runs: consecutiveCleanRuns
    }
  };
}
