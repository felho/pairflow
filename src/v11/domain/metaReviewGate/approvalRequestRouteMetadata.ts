import type { MetaReviewRecommendation } from "../../shared/metaReview/metaReviewTypes.js";
import {
  MetaReviewGateError,
  type MetaReviewGateThresholdMetadata
} from "./gateRoutingTypes.js";

const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";
const reviewPolicyAutoReworkThresholdNotMetReasonCode =
  "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET";
const reviewPolicyThresholdSourceUnresolvedReasonCode =
  "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED";
const reviewPolicyThresholdContextIncompleteReasonCode =
  "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE";

function resolveThresholdGateRouteMetadata(input: {
  route: string;
  recommendation?: MetaReviewRecommendation;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
}): Record<string, unknown> {
  if (
    input.route !== "human_gate_threshold_not_met"
    && input.route !== "human_gate_threshold_unresolved"
  ) {
    return {};
  }

  const thresholdMetadata = input.thresholdMetadata;
  if (thresholdMetadata === undefined) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: threshold route ${input.route} requires threshold metadata.`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
  if (input.recommendation !== "rework") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: threshold route ${input.route} requires latest_recommendation=rework.`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }

  if (input.route === "human_gate_threshold_not_met") {
    if (
      thresholdMetadata.status !== "not_met"
      || thresholdMetadata.reasonCode
        !== reviewPolicyAutoReworkThresholdNotMetReasonCode
      || thresholdMetadata.minSeverity === undefined
      || thresholdMetadata.highestOpenSeverity === undefined
    ) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "META_REVIEW_GATE_TRANSITION_INVALID: threshold-not-met route requires canonical not_met reason code plus min/highest severity metadata.",
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return {
      meta_review_gate_reason_code: thresholdMetadata.reasonCode,
      meta_review_gate_threshold_status: thresholdMetadata.status,
      meta_review_gate_threshold_min_severity: thresholdMetadata.minSeverity,
      meta_review_gate_threshold_highest_open_severity:
        thresholdMetadata.highestOpenSeverity
    };
  }

  if (
    thresholdMetadata.status !== "unresolved"
    && thresholdMetadata.status !== "incomplete"
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: threshold-unresolved route requires unresolved or incomplete threshold status.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
  if (
    (thresholdMetadata.status === "unresolved"
      && thresholdMetadata.reasonCode
        !== reviewPolicyThresholdSourceUnresolvedReasonCode)
    || (
      thresholdMetadata.status === "incomplete"
      && thresholdMetadata.reasonCode
        !== reviewPolicyThresholdContextIncompleteReasonCode
    )
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: threshold-unresolved route requires the canonical reason code for the supplied threshold status.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }

  return {
    meta_review_gate_reason_code: thresholdMetadata.reasonCode,
    meta_review_gate_threshold_status: thresholdMetadata.status
  };
}

export function resolveApprovalRequestGateRouteMetadata(input: {
  route: string;
  recommendation?: MetaReviewRecommendation;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
  gateReasonCode?: string;
}): Record<string, unknown> {
  const metadata = {
    meta_review_gate_route: input.route,
    ...resolveThresholdGateRouteMetadata(input),
    ...(input.gateReasonCode !== undefined
      ? { meta_review_gate_reason_code: input.gateReasonCode }
      : {})
  };
  if (input.route !== "human_gate_run_failed") {
    return metadata;
  }
  return {
    ...metadata,
    meta_review_gate_reason_code: metaReviewGateRunFailedReasonCode,
    meta_review_gate_run_failed: true
  };
}
