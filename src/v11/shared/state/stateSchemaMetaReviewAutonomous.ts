import {
  isMetaReviewRecommendation,
  isMetaReviewRunStatus,
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  type ValidationError
} from "../validation/primitives.js";

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

function isSafeArtifactsRef(value: string): boolean {
  return (
    value.startsWith("artifacts/") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    !value.includes("\0")
  );
}

function validateNullableRunScalars(input: {
  pathPrefix: string;
  lastRunId: unknown;
  lastStatus: unknown;
  lastRecommendation: unknown;
  lastSummary: unknown;
  lastReportRef: unknown;
  lastUpdatedAt: unknown;
  errors: ValidationError[];
}): {
  lastRunId: string | null;
  lastStatus: BubbleMetaReviewSnapshotState["last_autonomous_status"];
  lastRecommendation: BubbleMetaReviewSnapshotState["last_autonomous_recommendation"];
  lastSummary: string | null;
  lastReportRef: string | null;
  lastUpdatedAt: string | null;
  lastStatusValid: boolean;
  lastRecommendationValid: boolean;
} {
  const lastRunId = input.lastRunId === undefined ? null : input.lastRunId;
  validateNullableRunIdentity(input.pathPrefix, lastRunId, input.errors);
  const { lastStatus, lastRecommendation, lastStatusValid, lastRecommendationValid } =
    validateNullableRunOutcome(
      input.pathPrefix,
      input.lastStatus,
      input.lastRecommendation,
      input.errors
    );
  const { lastSummary, lastReportRef, lastUpdatedAt } = validateNullableRunArtifacts({
    pathPrefix: input.pathPrefix,
    lastSummary: input.lastSummary,
    lastReportRef: input.lastReportRef,
    lastUpdatedAt: input.lastUpdatedAt,
    errors: input.errors
  });

  return {
    lastRunId: isNonEmptyString(lastRunId) ? lastRunId : null,
    lastStatus:
      lastStatus === null || isMetaReviewRunStatus(lastStatus) ? lastStatus : null,
    lastRecommendation:
      lastRecommendation === null || isMetaReviewRecommendation(lastRecommendation)
        ? lastRecommendation
        : null,
    lastSummary: isNonEmptyString(lastSummary) ? lastSummary : null,
    lastReportRef: isNonEmptyString(lastReportRef) ? lastReportRef : null,
    lastUpdatedAt: isIsoTimestamp(lastUpdatedAt) ? lastUpdatedAt : null,
    lastStatusValid,
    lastRecommendationValid
  };
}

function validateNullableRunIdentity(
  pathPrefix: string,
  lastRunId: unknown,
  errors: ValidationError[]
): void {
  if (!(lastRunId === null || isNonEmptyString(lastRunId))) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_run_id`,
      message: "Must be null or a non-empty string"
    });
  }
}

function validateNullableRunOutcome(
  pathPrefix: string,
  lastStatus: unknown,
  lastRecommendation: unknown,
  errors: ValidationError[]
): {
  lastStatus: BubbleMetaReviewSnapshotState["last_autonomous_status"];
  lastRecommendation: BubbleMetaReviewSnapshotState["last_autonomous_recommendation"];
  lastStatusValid: boolean;
  lastRecommendationValid: boolean;
} {
  const lastStatusValid = lastStatus === null || isMetaReviewRunStatus(lastStatus);
  if (!lastStatusValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_status`,
      message: "Must be null or one of: success, error, inconclusive"
    });
  }

  const lastRecommendationValid =
    lastRecommendation === null || isMetaReviewRecommendation(lastRecommendation);
  if (!lastRecommendationValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_recommendation`,
      message: "Must be null or one of: rework, approve, inconclusive"
    });
  }

  return {
    lastStatus:
      lastStatus === null || isMetaReviewRunStatus(lastStatus) ? lastStatus : null,
    lastRecommendation:
      lastRecommendation === null || isMetaReviewRecommendation(lastRecommendation)
        ? lastRecommendation
        : null,
    lastStatusValid,
    lastRecommendationValid
  };
}

function validateNullableRunArtifacts(input: {
  pathPrefix: string;
  lastSummary: unknown;
  lastReportRef: unknown;
  lastUpdatedAt: unknown;
  errors: ValidationError[];
}): {
  lastSummary: string | null;
  lastReportRef: string | null;
  lastUpdatedAt: string | null;
} {
  const lastSummary = input.lastSummary;
  if (!(lastSummary === null || isNonEmptyString(lastSummary))) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_summary`,
      message: "Must be null or a non-empty string"
    });
  }

  const lastReportRef = input.lastReportRef;
  if (!(lastReportRef === null || isNonEmptyString(lastReportRef))) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_report_ref`,
      message: "Must be null or a non-empty string"
    });
  } else if (
    isNonEmptyString(lastReportRef) &&
    !isSafeArtifactsRef(lastReportRef)
  ) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_report_ref`,
      message: "Must be a safe artifacts/* reference when provided"
    });
  }

  const lastUpdatedAt = input.lastUpdatedAt;
  if (!(lastUpdatedAt === null || isIsoTimestamp(lastUpdatedAt))) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_updated_at`,
      message: "Must be null or a valid ISO timestamp"
    });
  }

  return {
    lastSummary: isNonEmptyString(lastSummary) ? lastSummary : null,
    lastReportRef: isNonEmptyString(lastReportRef) ? lastReportRef : null,
    lastUpdatedAt: isIsoTimestamp(lastUpdatedAt) ? lastUpdatedAt : null
  };
}

function validateReworkTargetMessage(input: {
  pathPrefix: string;
  lastRecommendation: BubbleMetaReviewSnapshotState["last_autonomous_recommendation"];
  lastRecommendationValid: boolean;
  lastReworkMessage: unknown;
  errors: ValidationError[];
}): string | null {
  const lastReworkMessage = input.lastReworkMessage;
  const isString = typeof lastReworkMessage === "string";
  const isValidNonEmptyString = isNonEmptyString(lastReworkMessage);
  const recommendationRequiresMessage =
    input.lastRecommendationValid && input.lastRecommendation === "rework";

  if (recommendationRequiresMessage) {
    if (lastReworkMessage === null || (isString && !isValidNonEmptyString)) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_rework_target_message`,
        message:
          "Must be a non-empty string when last_autonomous_recommendation is rework"
      });
    } else if (!isString) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_rework_target_message`,
        message: "Must be null or a non-empty string"
      });
    }
  } else if (lastReworkMessage !== null && !isValidNonEmptyString) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_rework_target_message`,
      message: "Must be null or a non-empty string"
    });
  }

  return isValidNonEmptyString ? lastReworkMessage : null;
}

function validateAutonomousSnapshotConsistency(input: {
  pathPrefix: string;
  snapshot: {
    lastRunId: string | null;
    lastStatus: BubbleMetaReviewSnapshotState["last_autonomous_status"];
    lastRecommendation: BubbleMetaReviewSnapshotState["last_autonomous_recommendation"];
    lastSummary: string | null;
    lastReportRef: string | null;
    lastReworkMessage: string | null;
    lastUpdatedAt: string | null;
  };
  errors: ValidationError[];
}): void {
  const { lastStatus, lastRecommendation } = input.snapshot;
  const statusIsNull = lastStatus === null;
  const recommendationIsNull = lastRecommendation === null;

  if (statusIsNull !== recommendationIsNull) {
    input.errors.push({
      path: input.pathPrefix,
      message:
        "last_autonomous_status and last_autonomous_recommendation must both be null or both be set"
    });
    return;
  }

  if (statusIsNull) {
    if (input.snapshot.lastRunId !== null) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_run_id`,
        message:
          "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
      });
    }
    if (input.snapshot.lastReportRef !== null) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_report_ref`,
        message:
          "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
      });
    }
    if (input.snapshot.lastSummary !== null) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_summary`,
        message:
          "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
      });
    }
    if (input.snapshot.lastReworkMessage !== null) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_rework_target_message`,
        message:
          "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
      });
    }
    if (input.snapshot.lastUpdatedAt !== null) {
      input.errors.push({
        path: `${input.pathPrefix}.last_autonomous_updated_at`,
        message:
          "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
      });
    }
    return;
  }

  if (input.snapshot.lastReportRef === null) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_report_ref`,
      message:
        "Must be a non-empty string when last_autonomous_status and last_autonomous_recommendation are set"
    });
  }

  if (
    (lastRecommendation === "rework" || lastRecommendation === "approve") &&
    lastStatus !== "success"
  ) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_status`,
      message:
        "Must be success when last_autonomous_recommendation is rework or approve"
    });
  }

  if (
    (lastStatus === "error" || lastStatus === "inconclusive") &&
    lastRecommendation !== "inconclusive"
  ) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_recommendation`,
      message:
        "Must be inconclusive when last_autonomous_status is error or inconclusive"
    });
  }

  if (input.snapshot.lastUpdatedAt === null) {
    input.errors.push({
      path: `${input.pathPrefix}.last_autonomous_updated_at`,
      message:
        "Must be a valid ISO timestamp when last_autonomous_status is set"
    });
  }
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
