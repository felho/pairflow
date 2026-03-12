import {
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../validation.js";
import {
  bubbleLifecycleStates,
  isAgentName,
  isAgentRole,
  isBubbleLifecycleState,
  isMetaReviewRecommendation,
  isMetaReviewRunStatus,
  isReworkIntentStatus,
  type BubbleMetaReviewSnapshotState,
  type BubbleReworkIntentRecord,
  type BubbleStateSnapshot,
  type RoundRoleHistoryEntry
} from "../../types/bubble.js";

function isSafeArtifactsRef(value: string): boolean {
  return (
    value.startsWith("artifacts/") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    !value.includes("\0")
  );
}

function validateRoundRoleEntry(
  input: unknown,
  index: number,
  errors: ValidationError[]
): RoundRoleHistoryEntry | undefined {
  const pathPrefix = `round_role_history[${index}]`;
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const round = input.round;
  if (!isInteger(round) || round <= 0) {
    errors.push({
      path: `${pathPrefix}.round`,
      message: "Must be a positive integer"
    });
  }

  const implementer = input.implementer;
  if (!isAgentName(implementer)) {
    errors.push({
      path: `${pathPrefix}.implementer`,
      message: "Must be one of: codex, claude"
    });
  }

  const reviewer = input.reviewer;
  if (!isAgentName(reviewer)) {
    errors.push({
      path: `${pathPrefix}.reviewer`,
      message: "Must be one of: codex, claude"
    });
  }

  const switchedAt = input.switched_at;
  if (!isIsoTimestamp(switchedAt)) {
    errors.push({
      path: `${pathPrefix}.switched_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (
    isAgentName(implementer) &&
    isAgentName(reviewer) &&
    implementer === reviewer
  ) {
    errors.push({
      path: pathPrefix,
      message: "implementer and reviewer cannot be the same agent"
    });
  }

  if (
    !isInteger(round) ||
    round <= 0 ||
    !isAgentName(implementer) ||
    !isAgentName(reviewer) ||
    !isIsoTimestamp(switchedAt)
  ) {
    return undefined;
  }

  return {
    round,
    implementer,
    reviewer,
    switched_at: switchedAt
  };
}

function validateReworkIntentRecord(
  input: unknown,
  pathPrefix: string,
  errors: ValidationError[]
): BubbleReworkIntentRecord | undefined {
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const intentId = input.intent_id;
  if (!isNonEmptyString(intentId)) {
    errors.push({
      path: `${pathPrefix}.intent_id`,
      message: "Must be a non-empty string"
    });
  }

  const message = input.message;
  if (!isNonEmptyString(message)) {
    errors.push({
      path: `${pathPrefix}.message`,
      message: "Must be a non-empty string"
    });
  }

  const refsRaw = input.refs;
  let refs: string[] | undefined;
  if (refsRaw !== undefined) {
    if (!Array.isArray(refsRaw)) {
      errors.push({
        path: `${pathPrefix}.refs`,
        message: "Must be an array when provided"
      });
    } else {
      const parsedRefs: string[] = [];
      refsRaw.forEach((ref, index) => {
        if (!isNonEmptyString(ref)) {
          errors.push({
            path: `${pathPrefix}.refs[${index}]`,
            message: "Must be a non-empty string"
          });
          return;
        }
        parsedRefs.push(ref);
      });
      if (parsedRefs.length === refsRaw.length) {
        refs = parsedRefs;
      }
    }
  }

  const requestedBy = input.requested_by;
  if (!isNonEmptyString(requestedBy)) {
    errors.push({
      path: `${pathPrefix}.requested_by`,
      message: "Must be a non-empty string"
    });
  }

  const requestedAt = input.requested_at;
  if (!isIsoTimestamp(requestedAt)) {
    errors.push({
      path: `${pathPrefix}.requested_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const status = input.status;
  if (!isReworkIntentStatus(status)) {
    errors.push({
      path: `${pathPrefix}.status`,
      message: "Must be one of: pending, applied, superseded"
    });
  }

  const supersededByIntentId = input.superseded_by_intent_id;
  if (
    supersededByIntentId !== undefined &&
    !isNonEmptyString(supersededByIntentId)
  ) {
    errors.push({
      path: `${pathPrefix}.superseded_by_intent_id`,
      message: "Must be a non-empty string when provided"
    });
  }

  if (
    isReworkIntentStatus(status) &&
    status !== "superseded" &&
    supersededByIntentId !== undefined
  ) {
    errors.push({
      path: `${pathPrefix}.superseded_by_intent_id`,
      message: "Only superseded intents may define superseded_by_intent_id"
    });
  }

  if (
    !isNonEmptyString(intentId) ||
    !isNonEmptyString(message) ||
    !isNonEmptyString(requestedBy) ||
    !isIsoTimestamp(requestedAt) ||
    !isReworkIntentStatus(status)
  ) {
    return undefined;
  }

  return {
    intent_id: intentId,
    message,
    ...(refs !== undefined ? { refs } : {}),
    requested_by: requestedBy,
    requested_at: requestedAt,
    status,
    ...(isNonEmptyString(supersededByIntentId)
      ? { superseded_by_intent_id: supersededByIntentId }
      : {})
  };
}

function validateMetaReviewSnapshot(
  input: unknown,
  errors: ValidationError[]
): BubbleMetaReviewSnapshotState | undefined {
  const pathPrefix = "meta_review";
  const errorCountAtStart = errors.length;
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const lastRunIdRaw = input.last_autonomous_run_id;
  const lastRunId = lastRunIdRaw === undefined ? null : lastRunIdRaw;
  const lastRunIdValid = lastRunId === null || isNonEmptyString(lastRunId);
  if (!lastRunIdValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_run_id`,
      message: "Must be null or a non-empty string"
    });
  }

  const lastStatus = input.last_autonomous_status;
  const lastStatusValid = lastStatus === null || isMetaReviewRunStatus(lastStatus);
  if (!lastStatusValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_status`,
      message: "Must be null or one of: success, error, inconclusive"
    });
  }

  const lastRecommendation = input.last_autonomous_recommendation;
  const lastRecommendationValid =
    lastRecommendation === null || isMetaReviewRecommendation(lastRecommendation);
  if (!lastRecommendationValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_recommendation`,
      message: "Must be null or one of: rework, approve, inconclusive"
    });
  }

  const lastSummary = input.last_autonomous_summary;
  const lastSummaryValid = lastSummary === null || isNonEmptyString(lastSummary);
  if (!lastSummaryValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_summary`,
      message: "Must be null or a non-empty string"
    });
  }

  const lastReportRef = input.last_autonomous_report_ref;
  const lastReportRefValid = lastReportRef === null || isNonEmptyString(lastReportRef);
  if (!lastReportRefValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_report_ref`,
      message: "Must be null or a non-empty string"
    });
  } else if (
    isNonEmptyString(lastReportRef) &&
    !isSafeArtifactsRef(lastReportRef)
  ) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_report_ref`,
      message: "Must be a safe artifacts/* reference when provided"
    });
  }

  const lastReworkMessage = input.last_autonomous_rework_target_message;
  const lastReworkMessageIsString = typeof lastReworkMessage === "string";
  const lastReworkMessageIsNonEmptyString = isNonEmptyString(lastReworkMessage);
  const recommendationRequiresReworkMessage =
    lastRecommendationValid && lastRecommendation === "rework";
  if (recommendationRequiresReworkMessage) {
    if (lastReworkMessage === null || (lastReworkMessageIsString && !lastReworkMessageIsNonEmptyString)) {
      errors.push({
        path: `${pathPrefix}.last_autonomous_rework_target_message`,
        message:
          "Must be a non-empty string when last_autonomous_recommendation is rework"
      });
    } else if (!lastReworkMessageIsString) {
      errors.push({
        path: `${pathPrefix}.last_autonomous_rework_target_message`,
        message: "Must be null or a non-empty string"
      });
    }
  } else if (
    lastReworkMessage !== null &&
    !lastReworkMessageIsNonEmptyString
  ) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_rework_target_message`,
      message: "Must be null or a non-empty string"
    });
  }

  const lastUpdatedAt = input.last_autonomous_updated_at;
  const lastUpdatedAtValid = lastUpdatedAt === null || isIsoTimestamp(lastUpdatedAt);
  if (!lastUpdatedAtValid) {
    errors.push({
      path: `${pathPrefix}.last_autonomous_updated_at`,
      message: "Must be null or a valid ISO timestamp"
    });
  }

  const autoReworkCount = input.auto_rework_count;
  const autoReworkCountValid =
    isInteger(autoReworkCount) && autoReworkCount >= 0;
  if (!autoReworkCountValid) {
    errors.push({
      path: `${pathPrefix}.auto_rework_count`,
      message: "Must be a non-negative integer"
    });
  }

  const autoReworkLimit = input.auto_rework_limit;
  const autoReworkLimitValid =
    isInteger(autoReworkLimit) && autoReworkLimit >= 1;
  if (!autoReworkLimitValid) {
    errors.push({
      path: `${pathPrefix}.auto_rework_limit`,
      message: "Must be an integer >= 1"
    });
  }

  const stickyHumanGate = input.sticky_human_gate;
  const stickyHumanGateValid = typeof stickyHumanGate === "boolean";
  if (!stickyHumanGateValid) {
    errors.push({
      path: `${pathPrefix}.sticky_human_gate`,
      message: "Must be a boolean"
    });
  }

  if (lastStatusValid && lastRecommendationValid) {
    const statusIsNull = lastStatus === null;
    const recommendationIsNull = lastRecommendation === null;
    if (statusIsNull !== recommendationIsNull) {
      errors.push({
        path: pathPrefix,
        message:
          "last_autonomous_status and last_autonomous_recommendation must both be null or both be set"
      });
    } else if (statusIsNull && recommendationIsNull) {
      if (lastRunId !== null) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_run_id`,
          message:
            "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
        });
      }
      if (lastReportRef !== null) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_report_ref`,
          message:
            "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
        });
      }
      if (lastSummary !== null) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_summary`,
          message:
            "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
        });
      }
      if (lastReworkMessage !== null) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_rework_target_message`,
          message:
            "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
        });
      }
      if (lastUpdatedAt !== null) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_updated_at`,
          message:
            "Must be null when last_autonomous_status and last_autonomous_recommendation are null"
        });
      }
    } else {
      if (!isNonEmptyString(lastReportRef)) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_report_ref`,
          message:
            "Must be a non-empty string when last_autonomous_status and last_autonomous_recommendation are set"
        });
      }

      if (
        isMetaReviewRecommendation(lastRecommendation) &&
        (lastRecommendation === "rework" || lastRecommendation === "approve") &&
        lastStatus !== "success"
      ) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_status`,
          message:
            "Must be success when last_autonomous_recommendation is rework or approve"
        });
      }

      if (
        (lastStatus === "error" || lastStatus === "inconclusive") &&
        lastRecommendation !== "inconclusive"
      ) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_recommendation`,
          message:
            "Must be inconclusive when last_autonomous_status is error or inconclusive"
        });
      }

      if (!isIsoTimestamp(lastUpdatedAt)) {
        errors.push({
          path: `${pathPrefix}.last_autonomous_updated_at`,
          message:
            "Must be a valid ISO timestamp when last_autonomous_status is set"
        });
      }
    }
  }

  if (errors.length > errorCountAtStart) {
    return undefined;
  }

  return {
    last_autonomous_run_id:
      isNonEmptyString(lastRunId) ? lastRunId : null,
    last_autonomous_status: lastStatus as BubbleMetaReviewSnapshotState["last_autonomous_status"],
    last_autonomous_recommendation:
      lastRecommendation as BubbleMetaReviewSnapshotState["last_autonomous_recommendation"],
    last_autonomous_summary:
      lastSummary as BubbleMetaReviewSnapshotState["last_autonomous_summary"],
    last_autonomous_report_ref:
      lastReportRef as BubbleMetaReviewSnapshotState["last_autonomous_report_ref"],
    last_autonomous_rework_target_message:
      lastReworkMessage as BubbleMetaReviewSnapshotState["last_autonomous_rework_target_message"],
    last_autonomous_updated_at:
      lastUpdatedAt as BubbleMetaReviewSnapshotState["last_autonomous_updated_at"],
    auto_rework_count:
      autoReworkCount as BubbleMetaReviewSnapshotState["auto_rework_count"],
    auto_rework_limit:
      autoReworkLimit as BubbleMetaReviewSnapshotState["auto_rework_limit"],
    sticky_human_gate:
      stickyHumanGate as BubbleMetaReviewSnapshotState["sticky_human_gate"]
  };
}

export function validateBubbleStateSnapshot(
  input: unknown
): ValidationResult<BubbleStateSnapshot> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "State must be an object" }]);
  }

  const bubbleId = input.bubble_id;
  if (!isNonEmptyString(bubbleId)) {
    errors.push({
      path: "bubble_id",
      message: "Must be a non-empty string"
    });
  }

  const state = input.state;
  if (!isBubbleLifecycleState(state)) {
    errors.push({
      path: "state",
      message: `Must be one of: ${bubbleLifecycleStates.join(", ")}`
    });
  }

  const round = input.round;
  if (!isInteger(round) || round < 0) {
    errors.push({
      path: "round",
      message: "Must be a non-negative integer"
    });
  }

  const activeAgent = input.active_agent;
  const activeRole = input.active_role;
  const activeSince = input.active_since;
  const lastCommandAt = input.last_command_at;

  if (!(activeAgent === null || isAgentName(activeAgent))) {
    errors.push({
      path: "active_agent",
      message: "Must be null or one of: codex, claude"
    });
  }

  if (!(activeRole === null || isAgentRole(activeRole))) {
    errors.push({
      path: "active_role",
      message: "Must be null or one of: implementer, reviewer, meta_reviewer"
    });
  }

  if (!(activeSince === null || isIsoTimestamp(activeSince))) {
    errors.push({
      path: "active_since",
      message: "Must be null or a valid ISO timestamp"
    });
  }

  if (!(lastCommandAt === null || isIsoTimestamp(lastCommandAt))) {
    errors.push({
      path: "last_command_at",
      message: "Must be null or a valid ISO timestamp"
    });
  }

  const historyRaw = input.round_role_history;
  const roundRoleHistory: RoundRoleHistoryEntry[] = [];
  if (!Array.isArray(historyRaw)) {
    errors.push({
      path: "round_role_history",
      message: "Must be an array"
    });
  } else {
    historyRaw.forEach((entry, index) => {
      const validated = validateRoundRoleEntry(entry, index, errors);
      if (validated !== undefined) {
        roundRoleHistory.push(validated);
      }
    });
  }

  const pendingReworkIntentRaw = input.pending_rework_intent;
  let pendingReworkIntent: BubbleReworkIntentRecord | null = null;
  if (pendingReworkIntentRaw === undefined || pendingReworkIntentRaw === null) {
    pendingReworkIntent = null;
  } else {
    const validated = validateReworkIntentRecord(
      pendingReworkIntentRaw,
      "pending_rework_intent",
      errors
    );
    if (validated !== undefined) {
      pendingReworkIntent = validated;
    }
  }

  if (
    pendingReworkIntent !== null &&
    pendingReworkIntent.status !== "pending"
  ) {
    errors.push({
      path: "pending_rework_intent.status",
      message: "pending_rework_intent must have status=pending"
    });
  }

  const reworkIntentHistoryRaw = input.rework_intent_history;
  const reworkIntentHistory: BubbleReworkIntentRecord[] = [];
  if (reworkIntentHistoryRaw === undefined) {
    // Default to empty history for backward-compatible state files.
  } else if (!Array.isArray(reworkIntentHistoryRaw)) {
    errors.push({
      path: "rework_intent_history",
      message: "Must be an array"
    });
  } else {
    reworkIntentHistoryRaw.forEach((entry, index) => {
      const path = `rework_intent_history[${index}]`;
      const validated = validateReworkIntentRecord(entry, path, errors);
      if (validated === undefined) {
        return;
      }
      if (validated.status === "pending") {
        errors.push({
          path: `${path}.status`,
          message: "History intents cannot use status=pending"
        });
        return;
      }
      reworkIntentHistory.push(validated);
    });
  }

  let metaReview: BubbleMetaReviewSnapshotState | undefined;
  const metaReviewRaw = input.meta_review;
  if (metaReviewRaw !== undefined) {
    metaReview = validateMetaReviewSnapshot(metaReviewRaw, errors);
  }

  const knownIntentIds = new Set<string>();
  if (pendingReworkIntent !== null) {
    knownIntentIds.add(pendingReworkIntent.intent_id);
  }
  for (const intent of reworkIntentHistory) {
    if (knownIntentIds.has(intent.intent_id)) {
      errors.push({
        path: "rework_intent_history",
        message: `Duplicate rework intent id: ${intent.intent_id}`
      });
      continue;
    }
    knownIntentIds.add(intent.intent_id);
  }

  const hasAnyActiveField =
    activeAgent !== null || activeRole !== null || activeSince !== null;
  const hasAllActiveFields =
    activeAgent !== null && activeRole !== null && activeSince !== null;

  if (hasAnyActiveField && !hasAllActiveFields) {
    errors.push({
      path: "active_*",
      message:
        "active_agent, active_role, and active_since must be provided together"
    });
  }

  if (state === "RUNNING" && !hasAllActiveFields) {
    errors.push({
      path: "active_*",
      message:
        "RUNNING state requires active_agent, active_role, and active_since"
    });
  }

  if (state === "META_REVIEW_RUNNING") {
    const metaReviewHasRunSnapshot =
      metaReview !== undefined &&
      metaReview.last_autonomous_status !== null &&
      metaReview.last_autonomous_recommendation !== null &&
      metaReview.last_autonomous_updated_at !== null;

    if (!hasAllActiveFields && !metaReviewHasRunSnapshot) {
      errors.push({
        path: "active_*",
        message:
          "META_REVIEW_RUNNING state requires active_agent, active_role, and active_since unless recovering from an existing meta-review snapshot"
      });
    }

    if (hasAllActiveFields && activeRole !== "meta_reviewer") {
      errors.push({
        path: "active_role",
        message:
          "META_REVIEW_RUNNING state requires active_role=meta_reviewer when active ownership is present"
      });
    }

    if (hasAllActiveFields && activeRole === "meta_reviewer" && activeAgent !== "codex") {
      errors.push({
        path: "active_agent",
        message:
          "META_REVIEW_RUNNING state requires active_agent=codex when active_role=meta_reviewer"
      });
    }
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    bubble_id: bubbleId as string,
    state: state as BubbleStateSnapshot["state"],
    round: round as number,
    active_agent: activeAgent as BubbleStateSnapshot["active_agent"],
    active_since: activeSince as BubbleStateSnapshot["active_since"],
    active_role: activeRole as BubbleStateSnapshot["active_role"],
    round_role_history: roundRoleHistory,
    last_command_at: lastCommandAt as BubbleStateSnapshot["last_command_at"],
    pending_rework_intent: pendingReworkIntent,
    rework_intent_history: reworkIntentHistory,
    ...(metaReview !== undefined ? { meta_review: metaReview } : {})
  });
}

export function assertValidBubbleStateSnapshot(input: unknown): BubbleStateSnapshot {
  const result = validateBubbleStateSnapshot(input);
  return assertValidation(result, "Invalid bubble state");
}
