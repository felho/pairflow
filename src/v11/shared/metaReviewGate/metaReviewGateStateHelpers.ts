import { applyStateTransition } from "../../../core/state/machine.js";
import { clearLiveMetaReviewSnapshot } from "../../../core/bubble/metaReview.js";
import { assertValidBubbleStateSnapshot } from "../../../core/state/stateSchema.js";
import {
  type BubbleStateSnapshot,
  type MetaReviewRecommendation,
  type MetaReviewRunStatus
} from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import {
  MetaReviewGateError,
  type MetaReviewGateRoute
} from "./metaReviewGateTypes.js";
import {
  buildHydratedMetaReviewSnapshotFromRunResult,
  metaReviewFallbackReportRef,
  normalizeMetaReviewSnapshot
} from "./metaReviewGateSnapshotHelpers.js";
export {
  buildHumanGateSummary,
  buildHydratedMetaReviewSnapshotFromRunResult,
  metaReviewFallbackReportRef,
  metaReviewerAgent,
  normalizeMetaReviewSnapshot,
  resolveCanonicalMetaReviewRunId,
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
  targetState: "READY_FOR_HUMAN_APPROVAL";
  stickyHumanGate: boolean;
  metaReviewRun?: MetaReviewRunResult;
  fallbackRecommendation?: MetaReviewRecommendation;
  fallbackSummary?: string;
}): BubbleStateSnapshot {
  const transitioned =
    input.current.state === input.targetState
      ? assertValidBubbleStateSnapshot({
          ...input.current,
          active_agent: null,
          active_role: null,
          active_since: null,
          execution_context: null,
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
  const shouldHydrateFromRunResult = input.metaReviewRun !== undefined;
  const runResult = input.metaReviewRun;
  const shouldHydrateFallbackRecommendation =
    input.fallbackRecommendation !== undefined;
  const fallbackRecommendation: MetaReviewRecommendation =
    input.fallbackRecommendation ?? "inconclusive";
  const fallbackStatus: MetaReviewRunStatus =
    fallbackRecommendation === "inconclusive" ? "error" : "success";
  const fallbackReworkTargetMessage =
    fallbackRecommendation === "rework"
      ? (
          typeof metaReview.last_autonomous_rework_target_message === "string" &&
          metaReview.last_autonomous_rework_target_message.trim().length > 0
            ? metaReview.last_autonomous_rework_target_message
            : "Meta-review gate fallback rework target unavailable."
        )
      : null;
  return {
    ...transitioned,
    meta_review: {
      ...metaReview,
      ...(shouldHydrateFromRunResult && runResult !== undefined
        ? buildHydratedMetaReviewSnapshotFromRunResult({
            metaReview,
            runResult
          })
        : shouldHydrateFallbackRecommendation
        ? {
            last_autonomous_run_id: null,
            last_autonomous_status: fallbackStatus,
            last_autonomous_recommendation: fallbackRecommendation,
            last_autonomous_summary:
              input.fallbackSummary ??
              `Meta-review gate fallback recommendation: ${fallbackRecommendation}.`,
            last_autonomous_report_ref: metaReviewFallbackReportRef,
            last_autonomous_rework_target_message: fallbackReworkTargetMessage,
            last_autonomous_updated_at: input.nowIso
          }
        : {}),
      sticky_human_gate: input.stickyHumanGate
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

export function resolveHumanGateRoute(
  recommendation: MetaReviewRecommendation,
  budgetAvailable: boolean
): Exclude<
  MetaReviewGateRoute,
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed"
> {
  if (recommendation === "approve") {
    return "human_gate_approve";
  }
  if (recommendation === "rework") {
    if (budgetAvailable) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "META_REVIEW_GATE_TRANSITION_INVALID: human gate route resolver reached rework+budgetAvailable branch unexpectedly.",
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return "human_gate_budget_exhausted";
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
  if (route === "human_gate_budget_exhausted" || route === "human_gate_sticky_bypass") {
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
