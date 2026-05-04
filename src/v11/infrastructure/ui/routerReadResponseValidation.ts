import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
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
      "payload",
      "refs"
    ]) &&
    typeof value.id === "string" &&
    typeof value.ts === "string" &&
    typeof value.round === "number" &&
    isProtocolMessageType(value.type) &&
    typeof value.sender === "string" &&
    typeof value.recipient === "string" &&
    isRecord(value.payload) &&
    isStringArray(value.refs)
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
