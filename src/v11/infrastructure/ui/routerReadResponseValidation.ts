import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineBadge,
  UiTimelineEntry
} from "../../../contracts/ui/uiReadModel.js";
import { uiApprovalRequestGateRoutes } from "../../../contracts/ui/uiReadModel.js";
import { isMetaReviewRecommendation } from "../../../types/bubble.js";
import { isProtocolMessageType } from "../../../types/protocol.js";
import { internalError, throwApiError } from "./routerHttp.js";
import {
  hasExactKeys,
  hasUiBubbleSummaryFields,
  hasUiBubbleSummaryKeys,
  isNullableString,
  isRecord,
  isStringArray,
  isUiBubbleSummary,
  isUiRepoSummary
} from "./uiContractShapeValidation.js";

export type UiReadResponseFamily =
  | "bubble_list"
  | "bubble_detail"
  | "bubble_timeline";

export interface BubbleListPresentedResponseBody {
  repo: UiRepoSummary;
  bubbles: UiBubbleSummary[];
}

export interface BubbleDetailResponseBody {
  bubble: UiBubbleDetail;
}

export interface BubbleTimelineResponseBody {
  bubbleId: string;
  repoPath: string;
  timeline: UiTimelineEntry[];
}

const timelineTones = ["neutral", "success", "warning", "danger", "info"] as const;
const timelineSummarySources = [
  "summary",
  "question",
  "message",
  "decision",
  "neutral"
] as const;
const timelineRoles = [
  "implementer",
  "reviewer",
  "meta_reviewer",
  "human",
  "system",
  "unknown"
] as const;
const timelineRowKinds = ["normal", "handoff", "approval", "gate_failure"] as const;
const validationFailureTones = ["neutral", "warning", "danger"] as const;
const timelineBadgeKinds = ["finding", "decision", "recommendation"] as const;

function isOneOf(
  value: unknown,
  allowed: readonly string[]
): value is string {
  return typeof value === "string" && allowed.includes(value);
}

function isPendingInboxCounts(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["humanQuestions", "approvalRequests", "total"]) &&
    typeof value.humanQuestions === "number" &&
    typeof value.approvalRequests === "number" &&
    typeof value.total === "number"
  );
}

function isBubbleWatchdog(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "monitored",
      "monitoredAgent",
      "timeoutMinutes",
      "referenceTimestamp",
      "deadlineTimestamp",
      "remainingSeconds",
      "expired"
    ]) &&
    typeof value.monitored === "boolean" &&
    (value.monitoredAgent === null || typeof value.monitoredAgent === "string") &&
    typeof value.timeoutMinutes === "number" &&
    isNullableString(value.referenceTimestamp) &&
    isNullableString(value.deadlineTimestamp) &&
    (value.remainingSeconds === null ||
      typeof value.remainingSeconds === "number") &&
    typeof value.expired === "boolean"
  );
}

function isUiBubbleInboxItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      ["envelopeId", "type", "ts", "round", "sender", "summary", "refs"],
      ["latestRecommendation", "gateRoute"]
    ) &&
    typeof value.envelopeId === "string" &&
    (value.type === "HUMAN_QUESTION" || value.type === "APPROVAL_REQUEST") &&
    typeof value.ts === "string" &&
    typeof value.round === "number" &&
    typeof value.sender === "string" &&
    typeof value.summary === "string" &&
    isStringArray(value.refs) &&
    (value.latestRecommendation === undefined ||
      isMetaReviewRecommendation(value.latestRecommendation)) &&
    (value.gateRoute === undefined ||
      (typeof value.gateRoute === "string" &&
        (uiApprovalRequestGateRoutes as readonly string[]).includes(
          value.gateRoute
        )))
  );
}

function isUiBubbleDetail(value: unknown): value is UiBubbleDetail {
  return (
    isRecord(value) &&
    hasUiBubbleSummaryKeys(
      value,
      [
        "bubbleToml",
        "watchdog",
        "pendingInboxItems",
        "inbox",
        "transcript"
      ]
    ) &&
    hasUiBubbleSummaryFields(value) &&
    isNullableString(value.bubbleToml) &&
    isBubbleWatchdog(value.watchdog) &&
    isPendingInboxCounts(value.pendingInboxItems) &&
    isRecord(value.inbox) &&
    hasExactKeys(value.inbox, ["pending", "items"]) &&
    isPendingInboxCounts(value.inbox.pending) &&
    Array.isArray(value.inbox.items) &&
    value.inbox.items.every(isUiBubbleInboxItem) &&
    isRecord(value.transcript) &&
    hasExactKeys(value.transcript, [
      "totalMessages",
      "lastMessageType",
      "lastMessageTs",
      "lastMessageId"
    ]) &&
    typeof value.transcript.totalMessages === "number" &&
    (value.transcript.lastMessageType === null ||
      isProtocolMessageType(value.transcript.lastMessageType)) &&
    isNullableString(value.transcript.lastMessageTs) &&
    isNullableString(value.transcript.lastMessageId)
  );
}

function isUiTimelineEntry(value: unknown): value is UiTimelineEntry {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "id",
      "ts",
      "round",
      "type",
      "sender",
      "recipient",
      "display",
      "payload",
      "refs"
    ]) &&
    typeof value.id === "string" &&
    typeof value.ts === "string" &&
    typeof value.round === "number" &&
    isProtocolMessageType(value.type) &&
    typeof value.sender === "string" &&
    typeof value.recipient === "string" &&
    isUiTimelineEntryDisplay(value.display) &&
    isRecord(value.payload) &&
    isStringArray(value.refs)
  );
}

function isUiTimelineTone(value: unknown): boolean {
  return isOneOf(value, timelineTones);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUiTimelineBadge(value: unknown): value is UiTimelineBadge {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["kind", "label", "tone"]) &&
    isOneOf(value.kind, timelineBadgeKinds) &&
    typeof value.label === "string" &&
    isUiTimelineTone(value.tone)
  );
}

function isUiTimelineProgress(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "meta_review_handoff") {
    return (
      hasExactKeys(value, ["kind", "label", "handoffAttempt"]) &&
      typeof value.label === "string" &&
      isNonNegativeInteger(value.handoffAttempt)
    );
  }
  if (value.kind === "clean_run") {
    return (
      hasExactKeys(value, [
        "kind",
        "label",
        "cleanRunCount",
        "cleanRunsRequired"
      ]) &&
      typeof value.label === "string" &&
      isNonNegativeInteger(value.cleanRunCount) &&
      (value.cleanRunsRequired === null ||
        isNonNegativeInteger(value.cleanRunsRequired))
    );
  }
  return false;
}

function isUiTimelineValidationFailure(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["summaryText", "tone"]) &&
    typeof value.summaryText === "string" &&
    isOneOf(value.tone, validationFailureTones)
  );
}

function isUiTimelineSyntheticApproval(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "kind",
      "sourceEntryId",
      "syntheticEntryId",
      "label",
      "tone"
    ]) &&
    value.kind === "meta_review_approval" &&
    typeof value.sourceEntryId === "string" &&
    typeof value.syntheticEntryId === "string" &&
    typeof value.label === "string" &&
    value.tone === "success"
  );
}

function isUiTimelineEntryDisplay(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "title",
      "summaryText",
      "summarySource",
      "senderLabel",
      "role",
      "rowKind",
      "tone",
      "badges",
      "progress",
      "validationFailure",
      "syntheticApproval"
    ]) &&
    typeof value.title === "string" &&
    typeof value.summaryText === "string" &&
    isOneOf(value.summarySource, timelineSummarySources) &&
    typeof value.senderLabel === "string" &&
    isOneOf(value.role, timelineRoles) &&
    isOneOf(value.rowKind, timelineRowKinds) &&
    isUiTimelineTone(value.tone) &&
    Array.isArray(value.badges) &&
    value.badges.every(isUiTimelineBadge) &&
    (value.progress === null || isUiTimelineProgress(value.progress)) &&
    (
      value.validationFailure === null ||
      isUiTimelineValidationFailure(value.validationFailure)
    ) &&
    (
      value.syntheticApproval === null ||
      isUiTimelineSyntheticApproval(value.syntheticApproval)
    )
  );
}

function throwInvalidReadResponse(family: UiReadResponseFamily): never {
  throwApiError(
    internalError("UI read response failed contract validation.", {
      reasonCode: "UI_READ_RESPONSE_INVALID",
      responseFamily: family
    })
  );
}

export function validateUiBubbleListResponseBody(
  body: unknown
): BubbleListPresentedResponseBody {
  if (
    isRecord(body) &&
    hasExactKeys(body, ["repo", "bubbles"]) &&
    isUiRepoSummary(body.repo) &&
    Array.isArray(body.bubbles) &&
    body.bubbles.every(isUiBubbleSummary)
  ) {
    return {
      repo: body.repo,
      bubbles: body.bubbles
    };
  }
  throwInvalidReadResponse("bubble_list");
}

export function validateUiBubbleDetailResponseBody(
  body: unknown
): BubbleDetailResponseBody {
  if (
    isRecord(body) &&
    hasExactKeys(body, ["bubble"]) &&
    isUiBubbleDetail(body.bubble)
  ) {
    return {
      bubble: body.bubble
    };
  }
  throwInvalidReadResponse("bubble_detail");
}

export function validateUiBubbleTimelineResponseBody(
  body: unknown
): BubbleTimelineResponseBody {
  if (
    isRecord(body) &&
    hasExactKeys(body, ["bubbleId", "repoPath", "timeline"]) &&
    typeof body.bubbleId === "string" &&
    typeof body.repoPath === "string" &&
    Array.isArray(body.timeline) &&
    body.timeline.every(isUiTimelineEntry)
  ) {
    return {
      bubbleId: body.bubbleId,
      repoPath: body.repoPath,
      timeline: body.timeline
    };
  }
  throwInvalidReadResponse("bubble_timeline");
}
