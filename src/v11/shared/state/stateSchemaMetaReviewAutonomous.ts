import {
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import {
  isInteger,
  type ValidationError
} from "../validation/primitives.js";
import {
  validateAutonomousSnapshotConsistency,
  validateNullableRunScalars,
  validateReworkTargetMessage
} from "./stateSchemaMetaReviewAutonomousSupport.js";

export interface ValidatedMetaReviewAutonomousSnapshot {
  last_autonomous_run_id: BubbleMetaReviewSnapshotState["last_autonomous_run_id"];
  last_autonomous_status: BubbleMetaReviewSnapshotState["last_autonomous_status"];
  last_autonomous_recommendation: BubbleMetaReviewSnapshotState["last_autonomous_recommendation"];
  last_autonomous_summary: BubbleMetaReviewSnapshotState["last_autonomous_summary"];
  last_autonomous_report_ref: BubbleMetaReviewSnapshotState["last_autonomous_report_ref"];
  last_autonomous_rework_target_message: BubbleMetaReviewSnapshotState["last_autonomous_rework_target_message"];
  last_autonomous_updated_at: BubbleMetaReviewSnapshotState["last_autonomous_updated_at"];
  auto_rework_count: BubbleMetaReviewSnapshotState["auto_rework_count"];
  auto_rework_limit: BubbleMetaReviewSnapshotState["auto_rework_limit"];
  sticky_human_gate: BubbleMetaReviewSnapshotState["sticky_human_gate"];
}

export function validateMetaReviewAutonomousSnapshot(
  input: Record<string, unknown>,
  pathPrefix: string,
  errors: ValidationError[]
): ValidatedMetaReviewAutonomousSnapshot | undefined {
  const errorCountAtStart = errors.length;
  const runScalars = validateNullableRunScalars({
    pathPrefix,
    lastRunId: input.last_autonomous_run_id,
    lastStatus: input.last_autonomous_status,
    lastRecommendation: input.last_autonomous_recommendation,
    lastSummary: input.last_autonomous_summary,
    lastReportRef: input.last_autonomous_report_ref,
    lastUpdatedAt: input.last_autonomous_updated_at,
    errors
  });

  const lastReworkMessage = validateReworkTargetMessage({
    pathPrefix,
    lastRecommendation: runScalars.lastRecommendation,
    lastRecommendationValid: runScalars.lastRecommendationValid,
    lastReworkMessage: input.last_autonomous_rework_target_message,
    errors
  });

  const autoReworkCount = input.auto_rework_count;
  if (!(isInteger(autoReworkCount) && autoReworkCount >= 0)) {
    errors.push({
      path: `${pathPrefix}.auto_rework_count`,
      message: "Must be a non-negative integer"
    });
  }

  const autoReworkLimit = input.auto_rework_limit;
  if (!(isInteger(autoReworkLimit) && autoReworkLimit >= 1)) {
    errors.push({
      path: `${pathPrefix}.auto_rework_limit`,
      message: "Must be an integer >= 1"
    });
  }

  const stickyHumanGate = input.sticky_human_gate;
  if (typeof stickyHumanGate !== "boolean") {
    errors.push({
      path: `${pathPrefix}.sticky_human_gate`,
      message: "Must be a boolean"
    });
  }

  if (runScalars.lastStatusValid && runScalars.lastRecommendationValid) {
    validateAutonomousSnapshotConsistency({
      pathPrefix,
      snapshot: {
        lastRunId: runScalars.lastRunId,
        lastStatus: runScalars.lastStatus,
        lastRecommendation: runScalars.lastRecommendation,
        lastSummary: runScalars.lastSummary,
        lastReportRef: runScalars.lastReportRef,
        lastReworkMessage,
        lastUpdatedAt: runScalars.lastUpdatedAt
      },
      errors
    });
  }

  if (errors.length > errorCountAtStart) {
    return undefined;
  }

  return {
    last_autonomous_run_id: runScalars.lastRunId,
    last_autonomous_status: runScalars.lastStatus,
    last_autonomous_recommendation: runScalars.lastRecommendation,
    last_autonomous_summary: runScalars.lastSummary,
    last_autonomous_report_ref: runScalars.lastReportRef,
    last_autonomous_rework_target_message: lastReworkMessage,
    last_autonomous_updated_at: runScalars.lastUpdatedAt,
    auto_rework_count:
      isInteger(autoReworkCount) && autoReworkCount >= 0 ? autoReworkCount : 0,
    auto_rework_limit:
      isInteger(autoReworkLimit) && autoReworkLimit >= 1 ? autoReworkLimit : 1,
    sticky_human_gate: typeof stickyHumanGate === "boolean" ? stickyHumanGate : false
  };
}
