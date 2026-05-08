import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineBadge,
  UiTimelineDisplayItem
} from "../../../contracts/ui/uiReadModel.js";
import { uiApprovalRequestGateRoutes } from "../../../contracts/ui/uiReadModel.js";
import { isMetaReviewRecommendation } from "../../shared/metaReview/metaReviewTypes.js";
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
  timeline: UiTimelineDisplayItem[];
}

const timelineTones = ["neutral", "success", "warning", "danger", "info"] as const;
const timelineRoles = [
  "implementer",
  "reviewer",
  "meta_reviewer",
  "human",
  "system",
  "unknown"
] as const;
const timelineBadgeKinds = ["finding", "decision", "recommendation", "status"] as const;

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

function isUiTimelineDisplayTag(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["label", "tone"]) &&
    typeof value.label === "string" &&
    isUiTimelineTone(value.tone)
  );
}

function isUiTimelineDisplayItem(value: unknown): value is UiTimelineDisplayItem {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "id",
      "sourceEntryId",
      "ts",
      "round",
      "role",
      "senderLabel",
      "title",
      "summaryText",
      "tone",
      "badges",
      "cleanRunTag",
      "gateFailed",
      "blocked",
      "convergence"
    ]) &&
    typeof value.id === "string" &&
    typeof value.sourceEntryId === "string" &&
    typeof value.ts === "string" &&
    typeof value.round === "number" &&
    isOneOf(value.role, timelineRoles) &&
    typeof value.senderLabel === "string" &&
    typeof value.title === "string" &&
    typeof value.summaryText === "string" &&
    isUiTimelineTone(value.tone) &&
    Array.isArray(value.badges) &&
    value.badges.every(isUiTimelineBadge) &&
    (value.cleanRunTag === null || isUiTimelineDisplayTag(value.cleanRunTag)) &&
    typeof value.gateFailed === "boolean" &&
    typeof value.blocked === "boolean" &&
    typeof value.convergence === "boolean"
  );
}

function isUiTimelineTone(value: unknown): boolean {
  return isOneOf(value, timelineTones);
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
    body.timeline.every(isUiTimelineDisplayItem)
  ) {
    return {
      bubbleId: body.bubbleId,
      repoPath: body.repoPath,
      timeline: body.timeline
    };
  }
  throwInvalidReadResponse("bubble_timeline");
}
