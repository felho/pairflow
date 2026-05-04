import type {
  UiBubbleInboxItem,
  UiPendingInboxItemSource
} from "../contracts/ui/uiReadModel.js";

export type {
  UiApprovalRequestGateRoute,
  UiBubbleAttention,
  UiBubbleAttentionCode,
  UiBubbleDetail,
  UiBubbleInbox,
  UiBubbleInboxInput,
  UiBubbleInboxItem,
  UiBubbleInboxView,
  UiBubbleListEntry,
  UiBubbleListStateCounts,
  UiBubbleListView,
  UiBubbleMetaReviewSummary,
  UiBubbleReviewPolicy,
  UiBubbleStateCounts,
  UiBubbleStatusInput,
  UiBubbleStatusView,
  UiBubbleSummary,
  UiBubbleTranscriptSummary,
  UiBubbleWatchdog,
  UiPendingInboxCounts,
  UiPendingInboxItemSource,
  UiPendingInboxItemType,
  UiRepoSummary,
  UiReviewVerificationState,
  UiRuntimeHealth,
  UiRuntimeMetaReviewerPaneBinding,
  UiRuntimeSessionRecord,
  UiRuntimeSessionsSummary,
  UiStatusCommandPathView,
  UiStatusExecutionContextView,
  UiStatusPaneActivityView,
  UiTimelineEntry
} from "../contracts/ui/uiReadModel.js";
export {
  uiApprovalRequestGateRoutes
} from "../contracts/ui/uiReadModel.js";
export type {
  UiApiErrorBody
} from "../contracts/ui/uiErrors.js";
export type {
  UiBubbleRemovedEvent,
  UiBubbleUpdatedEvent,
  UiEvent,
  UiEventBase,
  UiEventsConnectedPayload,
  UiRepoRemovedEvent,
  UiRepoUpdatedEvent,
  UiSnapshotEvent,
  UiSseEventName
} from "../contracts/ui/uiEvents.js";
export {
  uiSseEventNames
} from "../contracts/ui/uiEvents.js";

export function mapPendingInboxItems(
  items: UiPendingInboxItemSource[]
): UiBubbleInboxItem[] {
  return items.map((item) => ({
    envelopeId: item.envelopeId,
    type: item.type,
    ts: item.ts,
    round: item.round,
    sender: item.sender,
    summary: item.summary,
    refs: item.refs,
    ...(item.latestRecommendation !== undefined
      ? { latestRecommendation: item.latestRecommendation }
      : {}),
    ...(item.gateRoute !== undefined
      ? { gateRoute: item.gateRoute }
      : {})
  }));
}
