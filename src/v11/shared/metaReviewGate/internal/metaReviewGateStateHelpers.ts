import { applyStateTransition } from "../../../domain/state/machine.js";
import { assertValidBubbleStateSnapshot } from "../../state/stateSchema.js";
import {
  type BubbleStateSnapshot,
  type MetaReviewRecommendation
} from "../../../../types/bubble.js";
import {
  MetaReviewGateError,
  type MetaReviewGateRoute,
  type MetaReviewGateThresholdStatus
} from "../metaReviewGateTypes.js";
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
const metaReviewGateAutoReworkRetryRoundInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_INVARIANT";
const metaReviewGateAutoReworkRetryOwnershipInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_OWNERSHIP_INVARIANT";
const metaReviewGateAutoReworkRetryRoundRoleHistoryInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_ROLE_HISTORY_INVARIANT";
export const metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_RUN_IDENTITY_INVARIANT";

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

export function resolveHumanGateRoute(input: {
  recommendation: MetaReviewRecommendation;
  budgetAvailable: boolean;
  thresholdStatus?: MetaReviewGateThresholdStatus | null;
}
): Exclude<
  MetaReviewGateRoute,
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed"
> {
  if (input.recommendation === "approve") {
    return "human_gate_approve";
  }
  if (input.recommendation === "rework") {
    if (!input.budgetAvailable) {
      return "human_gate_budget_exhausted";
    }
    if (input.thresholdStatus === "not_met") {
      return "human_gate_threshold_not_met";
    }
    if (
      input.thresholdStatus === "unresolved"
      || input.thresholdStatus === "incomplete"
    ) {
      return "human_gate_threshold_unresolved";
    }
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: human gate route resolver reached rework+budgetAvailable without threshold decision.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
  return "human_gate_inconclusive";
}

export function resolveDefaultStickyHumanGateForRoute(route: MetaReviewGateRoute): boolean {
  if (route === "human_gate_run_failed" || route === "human_gate_dispatch_failed") {
    return false;
  }
  if (route === "human_gate_approve" || route === "human_gate_inconclusive") {
    return true;
  }
  if (
    route === "human_gate_budget_exhausted"
    || route === "human_gate_threshold_not_met"
    || route === "human_gate_threshold_unresolved"
    || route === "human_gate_sticky_bypass"
  ) {
    return true;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: sticky_human_gate default policy is undefined for route=${route}.`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

export function resolveAutoReworkRetryInvariantViolation(input: {
  latest: BubbleStateSnapshot;
  expected: BubbleStateSnapshot;
}): string | null {
  if (input.latest.round !== input.expected.round) {
    return metaReviewGateAutoReworkRetryRoundInvariantReasonCode;
  }
  if (
    input.latest.active_role !== input.expected.active_role ||
    input.latest.active_agent !== input.expected.active_agent
  ) {
    return metaReviewGateAutoReworkRetryOwnershipInvariantReasonCode;
  }
  const expectedRoundRole = input.expected.round_role_history.find(
    (entry) => entry.round === input.expected.round
  );
  const latestRoundRole = input.latest.round_role_history.find(
    (entry) => entry.round === input.latest.round
  );
  if (
    expectedRoundRole === undefined ||
    latestRoundRole === undefined ||
    latestRoundRole.implementer !== expectedRoundRole.implementer ||
    latestRoundRole.reviewer !== expectedRoundRole.reviewer
  ) {
    return metaReviewGateAutoReworkRetryRoundRoleHistoryInvariantReasonCode;
  }
  return null;
}
