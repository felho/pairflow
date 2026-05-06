import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineBadge,
  UiTimelineEntry,
  UiTimelineFinding
} from "../../../contracts/ui/uiReadModel.js";
import { uiApprovalRequestGateRoutes } from "../../../contracts/ui/uiReadModel.js";
import { isMetaReviewRecommendation } from "../../../types/bubble.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming
} from "../../../types/findings.js";
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
const timelineRowKinds = [
  "normal",
  "handoff",
  "approval",
  "blocked",
  "gate_failure"
] as const;
const validationFailureTones = ["neutral", "warning", "danger"] as const;
const timelineBadgeKinds = ["finding", "decision", "recommendation", "status"] as const;
const timelinePayloadKeys = [
  "summary",
  "question",
  "message",
  "decision",
  "pass_intent",
  "findings_claim_state",
  "findings_claim_source",
  "findings"
] as const;
const timelinePayloadStringKeys = ["summary", "question", "message"] as const;
const uiTimelineDecisions = ["approve", "rework"] as const;
const uiTimelinePassIntents = ["task", "review", "fix_request"] as const;
const uiTimelineFindingsClaimStates = ["clean", "open_findings", "unknown"] as const;
const uiTimelineFindingsClaimSources = ["payload_flags", "payload_findings_count", "legacy_summary_parser", "meta_review_artifact"] as const;
const timelineFindingKeys = [
  "priority",
  "severity",
  "timing",
  "layer",
  "evidence",
  "detail",
  "code",
  "refs",
  "effective_priority"
] as const;
const timelineFindingStringKeys = ["detail", "code"] as const;

function isOneOf(
  value: unknown,
  allowed: readonly string[]
): value is string {
  return typeof value === "string" && allowed.includes(value);
}

function hasOptionalStringFields(
  value: Record<string, unknown>,
  fields: readonly string[]
): boolean {
  return fields.every((field) => {
    const candidate = value[field];
    return candidate === undefined || typeof candidate === "string";
  });
}

function hasOptionalOneOfField(
  value: Record<string, unknown>,
  field: string,
  allowed: readonly string[]
): boolean {
  const candidate = value[field];
  return candidate === undefined || isOneOf(candidate, allowed);
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
    isUiTimelineEntryPayload(value.payload) &&
    isStringArray(value.refs)
  );
}

function hasRenderableFindingPriorityFields(value: Record<string, unknown>): boolean {
  return (
    (value.priority === undefined || isFindingPriority(value.priority)) &&
    (
      value.effective_priority === undefined ||
      isFindingPriority(value.effective_priority)
    ) &&
    (value.severity === undefined || isFindingSeverity(value.severity)) &&
    (
      isFindingPriority(value.effective_priority) ||
      isFindingPriority(value.priority) ||
      isFindingSeverity(value.severity)
    )
  );
}

function hasOptionalFindingEvidence(value: Record<string, unknown>): boolean {
  const evidence = value.evidence;
  return (
    evidence === undefined ||
    typeof evidence === "string" ||
    isStringArray(evidence)
  );
}

function isUiTimelineFinding(value: unknown): value is UiTimelineFinding {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["title"], timelineFindingKeys) &&
    typeof value.title === "string" &&
    hasRenderableFindingPriorityFields(value) &&
    (value.timing === undefined || isFindingTiming(value.timing)) &&
    (value.layer === undefined || isFindingLayer(value.layer)) &&
    hasOptionalFindingEvidence(value) &&
    hasOptionalStringFields(value, timelineFindingStringKeys) &&
    (value.refs === undefined || isStringArray(value.refs))
  );
}

function hasValidFindingsClaimPair(value: Record<string, unknown>): boolean {
  const hasClaimState = value.findings_claim_state !== undefined;
  const hasClaimSource = value.findings_claim_source !== undefined;
  if (!hasClaimState && !hasClaimSource) {
    return true;
  }
  if (
    !isOneOf(value.findings_claim_state, uiTimelineFindingsClaimStates) ||
    !isOneOf(value.findings_claim_source, uiTimelineFindingsClaimSources)
  ) {
    return false;
  }
  if (value.findings_claim_state === "open_findings") {
    return Array.isArray(value.findings) && value.findings.length > 0;
  }
  if (value.findings_claim_state === "clean") {
    return !Array.isArray(value.findings) || value.findings.length === 0;
  }
  return true;
}

function isUiTimelineEntryPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [], timelinePayloadKeys) &&
    hasOptionalStringFields(value, timelinePayloadStringKeys) &&
    hasOptionalOneOfField(value, "decision", uiTimelineDecisions) &&
    hasOptionalOneOfField(value, "pass_intent", uiTimelinePassIntents) &&
    hasValidFindingsClaimPair(value) &&
    (
      value.findings === undefined ||
      (Array.isArray(value.findings) && value.findings.every(isUiTimelineFinding))
    )
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
	      isNonNegativeInteger(value.handoffAttempt) &&
	      value.handoffAttempt > 0
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
