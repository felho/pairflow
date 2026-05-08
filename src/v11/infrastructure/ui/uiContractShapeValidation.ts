import type {
  UiBubbleSummary,
  UiRepoSummary
} from "../../../contracts/ui/uiReadModel.js";
import { bubbleLifecycleStates } from "../../../contracts/kernel/lifecycle.js";
import {
  bubbleReviewLoopModes,
  bubbleReviewSupportStatuses,
  isBubbleReviewAutoReworkSeverity
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import {
  isMetaReviewRuntimeDeliveryStatus
} from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import {
  workModes
} from "../../shared/config/bubbleConfigVocabulary.js";

const lifecycleStates = new Set<string>(bubbleLifecycleStates);
const exactKeysCache = new Map<string, ReadonlySet<string>>();
const uiBubbleSummaryRequiredKeys = [
  "bubbleId",
  "repoPath",
  "worktreePath",
  "state",
  "round",
  "activeAgent",
  "activeRole",
  "activeSince",
  "lastCommandAt",
  "stateValidation",
  "runtimeSession",
  "runtime",
  "attention",
  "reviewPolicy",
  "metaReview"
] as const;
const attentionCodes = new Set([
  "state_invalid",
  "runtime_missing",
  "startup_incomplete",
  "runtime_mismatch",
  "no_session",
  "pane_unreadable",
  "pane_activity_invalid",
  "watchdog_expired",
  "quiet_pane"
]);
const remoteCacheStatuses = new Set(["present", "missing", "invalid"]);
const listRemoteStateSources = new Set([
  "cache",
  "refresh",
  "created_not_started",
  "unavailable_started"
]);
const remoteRuntimeAvailabilities = new Set([
  "active",
  "inactive",
  "missing",
  "not_started"
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
): boolean {
  const cacheKey = `${required.join("\u0000")}\u0001${optional.join("\u0000")}`;
  let allowed = exactKeysCache.get(cacheKey);
  if (allowed === undefined) {
    allowed = new Set([...required, ...optional]);
    exactKeysCache.set(cacheKey, allowed);
  }
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isNullableRecord(value: unknown): boolean {
  return value === null || isRecord(value);
}

function isStateCounts(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, bubbleLifecycleStates) &&
    bubbleLifecycleStates.every((state) => typeof value[state] === "number")
  );
}

function isRuntimeSessionsSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["registered", "stale"]) &&
    typeof value.registered === "number" &&
    typeof value.stale === "number"
  );
}

function isRemoteExecutionSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      ["createdNotStarted", "unavailableStarted"],
      ["refreshedThisRun"]
    ) &&
    typeof value.createdNotStarted === "number" &&
    typeof value.unavailableStarted === "number" &&
    (value.refreshedThisRun === undefined ||
      typeof value.refreshedThisRun === "boolean")
  );
}

function isRuntimeHealth(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["expected", "present", "stale"]) &&
    typeof value.expected === "boolean" &&
    typeof value.present === "boolean" &&
    typeof value.stale === "boolean"
  );
}

function isMetaReviewSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      ["actor", "authorityActive", "consecutiveCleanRuns", "runtimeDelivery"]
    ) &&
    value.actor === "meta-reviewer" &&
    typeof value.authorityActive === "boolean" &&
    typeof value.consecutiveCleanRuns === "number" &&
    (value.runtimeDelivery === null ||
      isMetaReviewRuntimeDelivery(value.runtimeDelivery))
  );
}

function isMetaReviewRuntimeDelivery(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "reasonCode",
      "message",
      "observedAt",
      "observedForHandoffId",
      "observedForRound"
    ]) &&
    isMetaReviewRuntimeDeliveryStatus(value.status) &&
    isNullableString(value.reasonCode) &&
    typeof value.message === "string" &&
    typeof value.observedAt === "string" &&
    isNullableString(value.observedForHandoffId) &&
    (value.observedForRound === null ||
      typeof value.observedForRound === "number")
  );
}

function isStateValidationDiagnostics(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["message", "errors"]) &&
    typeof value.message === "string" &&
    Array.isArray(value.errors) &&
    value.errors.every(
      (error) =>
        isRecord(error) &&
        hasExactKeys(error, ["path", "message"]) &&
        typeof error.path === "string" &&
        typeof error.message === "string"
    )
  );
}

function isRuntimeMetaReviewerPaneBinding(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["role", "paneIndex", "active", "updatedAt"]) &&
    value.role === "meta-reviewer" &&
    typeof value.paneIndex === "number" &&
    typeof value.active === "boolean" &&
    typeof value.updatedAt === "string"
  );
}

function isRuntimeSessionRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      [
        "bubbleId",
        "repoPath",
        "worktreePath",
        "tmuxSessionName",
        "updatedAt"
      ],
      ["workspacePath", "workspaceKind", "metaReviewerPane"]
    ) &&
    typeof value.bubbleId === "string" &&
    typeof value.repoPath === "string" &&
    typeof value.worktreePath === "string" &&
    typeof value.tmuxSessionName === "string" &&
    typeof value.updatedAt === "string" &&
    (value.workspacePath === undefined ||
      typeof value.workspacePath === "string") &&
    (value.workspaceKind === undefined ||
      (typeof value.workspaceKind === "string" &&
        (workModes as readonly string[]).includes(value.workspaceKind))) &&
    (value.metaReviewerPane === undefined ||
      isRuntimeMetaReviewerPaneBinding(value.metaReviewerPane))
  );
}

function isUiBubbleAttention(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["code", "severity", "label"], ["detail"]) &&
    typeof value.code === "string" &&
    attentionCodes.has(value.code) &&
    (value.severity === "warning" || value.severity === "critical") &&
    typeof value.label === "string" &&
    (value.detail === undefined || typeof value.detail === "string")
  );
}

function isUiBubbleReviewPolicy(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      [
        "requested_loop_mode",
        "effective_loop_mode",
        "support_status",
        "reviewer_blocking_min_severity",
        "meta_review_auto_rework_min_severity",
        "meta_review_consecutive_clean_runs_required"
      ],
      ["blocked_reason_code", "blocked_prerequisites", "provenance_note"]
    ) &&
    typeof value.requested_loop_mode === "string" &&
    (bubbleReviewLoopModes as readonly string[]).includes(
      value.requested_loop_mode
    ) &&
    typeof value.effective_loop_mode === "string" &&
    (bubbleReviewLoopModes as readonly string[]).includes(
      value.effective_loop_mode
    ) &&
    typeof value.support_status === "string" &&
    (bubbleReviewSupportStatuses as readonly string[]).includes(
      value.support_status
    ) &&
    isBubbleReviewAutoReworkSeverity(value.reviewer_blocking_min_severity) &&
    isBubbleReviewAutoReworkSeverity(
      value.meta_review_auto_rework_min_severity
    ) &&
    typeof value.meta_review_consecutive_clean_runs_required === "number" &&
    (value.blocked_reason_code === undefined ||
      typeof value.blocked_reason_code === "string") &&
    (value.blocked_prerequisites === undefined ||
      isStringArray(value.blocked_prerequisites)) &&
    (value.provenance_note === undefined ||
      typeof value.provenance_note === "string")
  );
}

function isRemoteExecutionBase(value: Record<string, unknown>): boolean {
  return (
    typeof value.alias === "string" &&
    typeof value.host === "string" &&
    (value.pointerKind === "created" || value.pointerKind === "started") &&
    typeof value.cacheStatus === "string" &&
    remoteCacheStatuses.has(value.cacheStatus) &&
    (value.remoteClonePath === undefined ||
      typeof value.remoteClonePath === "string") &&
    (value.lastCacheCheckAt === undefined ||
      typeof value.lastCacheCheckAt === "string")
  );
}

function isListRemoteCompatLifecyclePlaceholder(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["state", "source"], ["round"]) &&
    lifecycleStates.has(value.state as string) &&
    value.source === "local_control_plane_compat" &&
    (value.round === undefined || typeof value.round === "number")
  );
}

function isUiBubbleListRemoteExecution(
  value: Record<string, unknown>
): boolean {
  return (
    hasExactKeys(
      value,
      ["alias", "host", "pointerKind", "cacheStatus", "viewKind", "stateSource"],
      [
        "remoteClonePath",
        "lastCacheCheckAt",
        "refreshAttemptedAt",
        "runtimeAvailability",
        "runtimeReasonCode",
        "reasonCode",
        "lastLiveCheckAt",
        "compatLifecyclePlaceholder"
      ]
    ) &&
    isRemoteExecutionBase(value) &&
    typeof value.stateSource === "string" &&
    listRemoteStateSources.has(value.stateSource) &&
    (value.refreshAttemptedAt === undefined ||
      typeof value.refreshAttemptedAt === "string") &&
    (value.runtimeAvailability === undefined ||
      (typeof value.runtimeAvailability === "string" &&
        remoteRuntimeAvailabilities.has(value.runtimeAvailability))) &&
    (value.runtimeReasonCode === undefined ||
      value.runtimeReasonCode === "STATUS_REMOTE_RUNTIME_MISSING") &&
    (value.reasonCode === undefined ||
      value.reasonCode === "LIST_REMOTE_REFRESH_UNAVAILABLE" ||
      value.reasonCode === "LIST_REMOTE_CACHE_WRITE_FAILED") &&
    (value.lastLiveCheckAt === undefined ||
      typeof value.lastLiveCheckAt === "string") &&
    (value.compatLifecyclePlaceholder === undefined ||
      isListRemoteCompatLifecyclePlaceholder(value.compatLifecyclePlaceholder))
  );
}

function isUiBubbleStatusRemoteExecution(
  value: Record<string, unknown>
): boolean {
  return (
    hasExactKeys(
      value,
      [
        "alias",
        "host",
        "pointerKind",
        "cacheStatus",
        "viewKind",
        "statusSource",
        "runtimeAvailability"
      ],
      [
        "remoteClonePath",
        "lastCacheCheckAt",
        "reasonCode",
        "cacheReasonCode",
        "lastLiveCheckAt"
      ]
    ) &&
    isRemoteExecutionBase(value) &&
    (value.statusSource === "created_not_started" ||
      value.statusSource === "live") &&
    typeof value.runtimeAvailability === "string" &&
    remoteRuntimeAvailabilities.has(value.runtimeAvailability) &&
    (value.reasonCode === undefined ||
      value.reasonCode === "STATUS_REMOTE_RUNTIME_MISSING") &&
    (value.cacheReasonCode === undefined ||
      value.cacheReasonCode === "STATUS_REMOTE_CACHE_WRITE_FAILED" ||
      value.cacheReasonCode === "STATUS_REMOTE_CACHE_FALLBACK_READ_FAILED" ||
      value.cacheReasonCode === "STATUS_REMOTE_CACHE_READ_FAILED") &&
    (value.lastLiveCheckAt === undefined ||
      typeof value.lastLiveCheckAt === "string")
  );
}

function isUiBubbleRemoteExecution(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (value.viewKind === "list") {
    return isUiBubbleListRemoteExecution(value);
  }
  if (value.viewKind === "status") {
    return isUiBubbleStatusRemoteExecution(value);
  }
  return false;
}

export function isUiRepoSummary(value: unknown): value is UiRepoSummary {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      ["repoPath", "total", "byState", "runtimeSessions"],
      ["remoteExecutionSummary"]
    ) &&
    typeof value.repoPath === "string" &&
    typeof value.total === "number" &&
    isStateCounts(value.byState) &&
    isRuntimeSessionsSummary(value.runtimeSessions) &&
    (value.remoteExecutionSummary === undefined ||
      isRemoteExecutionSummary(value.remoteExecutionSummary))
  );
}

export function isUiBubbleSummary(value: unknown): value is UiBubbleSummary {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, uiBubbleSummaryRequiredKeys, ["remoteExecution"])
  ) {
    return false;
  }
  return hasUiBubbleSummaryFields(value);
}

export function hasUiBubbleSummaryFields(
  value: Record<string, unknown>
): boolean {
  return (
    hasUiBubbleSummaryIdentityFields(value) &&
    hasUiBubbleSummaryNullableFields(value) &&
    hasUiBubbleSummaryNestedFields(value)
  );
}

function hasUiBubbleSummaryIdentityFields(
  value: Record<string, unknown>
): boolean {
  return (
    typeof value.bubbleId === "string" &&
    typeof value.repoPath === "string" &&
    typeof value.worktreePath === "string" &&
    lifecycleStates.has(value.state as string) &&
    typeof value.round === "number"
  );
}

function hasUiBubbleSummaryNullableFields(
  value: Record<string, unknown>
): boolean {
  return (
    isNullableString(value.activeAgent) &&
    isNullableString(value.activeRole) &&
    isNullableString(value.activeSince) &&
    isNullableString(value.lastCommandAt) &&
    (value.attention === null || isUiBubbleAttention(value.attention)) &&
    (value.reviewPolicy === null || isUiBubbleReviewPolicy(value.reviewPolicy))
  );
}

function hasUiBubbleSummaryNestedFields(
  value: Record<string, unknown>
): boolean {
  return (
    (value.stateValidation === null ||
      isStateValidationDiagnostics(value.stateValidation)) &&
    (value.runtimeSession === null || isRuntimeSessionRecord(value.runtimeSession)) &&
    isRuntimeHealth(value.runtime) &&
    isMetaReviewSummary(value.metaReview) &&
    (value.remoteExecution === undefined ||
      isUiBubbleRemoteExecution(value.remoteExecution))
  );
}

export function hasUiBubbleSummaryKeys(
  value: Record<string, unknown>,
  extraRequired: readonly string[] = [],
  extraOptional: readonly string[] = []
): boolean {
  return hasExactKeys(
    value,
    [...uiBubbleSummaryRequiredKeys, ...extraRequired],
    ["remoteExecution", ...extraOptional]
  );
}
