import type { MetaReviewRecommendation } from "../../shared/metaReview/metaReviewTypes.js";
import {
  MetaReviewGateError,
  type MetaReviewGateRoute,
  type MetaReviewGateThresholdStatus
} from "../../shared/metaReviewGate/metaReviewGateRouteContract.js";

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
      input.thresholdStatus === "unresolved" ||
      input.thresholdStatus === "incomplete"
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
    route === "human_gate_budget_exhausted" ||
    route === "human_gate_threshold_not_met" ||
    route === "human_gate_threshold_unresolved" ||
    route === "human_gate_sticky_bypass"
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
