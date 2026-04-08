import {
  isMetaReviewRecommendation,
  isMetaReviewRunStatus,
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import {
  isIsoTimestamp,
  isNonEmptyString,
  type ValidationError
} from "../validation/primitives.js";

export interface ValidatedNullableRunScalars {
  lastRunId: string | null;
  lastStatus: BubbleMetaReviewSnapshotState["last_autonomous_status"];
  lastRecommendation: BubbleMetaReviewSnapshotState["last_autonomous_recommendation"];
  lastSummary: string | null;
  lastReportRef: string | null;
  lastUpdatedAt: string | null;
  lastStatusValid: boolean;
  lastRecommendationValid: boolean;
}

function isSafeArtifactsRef(value: string): boolean {
  return (
    value.startsWith("artifacts/") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    !value.includes("\0")
  );
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

export function validateNullableRunScalars(input: {
  pathPrefix: string;
  lastRunId: unknown;
  lastStatus: unknown;
  lastRecommendation: unknown;
  lastSummary: unknown;
  lastReportRef: unknown;
  lastUpdatedAt: unknown;
  errors: ValidationError[];
}): ValidatedNullableRunScalars {
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

export function validateReworkTargetMessage(input: {
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

export function validateAutonomousSnapshotConsistency(input: {
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
