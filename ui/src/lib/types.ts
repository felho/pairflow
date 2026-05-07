import {
  bubbleLifecycleStates
} from "@pairflow/ui-contracts";
import type {
  BubbleLifecycleState,
  DeleteBubbleArtifacts as BubbleDeleteArtifacts,
  DeleteBubbleResult as BubbleDeleteResult,
  MetaReviewQualityPreset as CanonicalMetaReviewQualityPreset,
  UiApiErrorBody,
  UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals,
  UiApprovalRequestGateRoute,
  UiAttachBubbleResult,
  UiAttachBubbleResult as CanonicalUiAttachBubbleResult,
  UiBubbleAttention,
  UiBubbleAttentionCode,
  UiBubbleDetail,
  UiBubbleInbox,
  UiBubbleInboxInput,
  UiBubbleInboxItem,
  UiBubbleInboxView,
  UiBubbleListEntry,
  UiBubbleListRemoteExecution,
  UiBubbleListStateCounts,
  UiBubbleListView,
  UiBubbleMetaReviewSummary,
  UiBubbleRemovedEvent,
  UiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution,
  UiBubbleReviewPolicy,
  UiBubbleStateCounts,
  UiBubbleStatusCacheReasonCode,
  UiBubbleStatusInput,
  UiBubbleStatusRemoteExecution,
  UiBubbleStatusView,
  UiBubbleSummary,
  UiBubbleTranscriptSummary,
  UiBubbleUpdatedEvent,
  UiBubbleWatchdog,
  UiCommitBubbleInput,
  UiCommitBubbleResult,
  UiDeleteBubbleInput,
  UiDeleteBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitApproveInput,
  UiEmitHumanReplyInput,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkInput,
  UiEmitRequestReworkQueuedResult,
  UiEmitRequestReworkResult,
  UiEvent,
  UiEventBase,
  UiEventsConnectedPayload,
  UiMergeBubbleInput,
  UiMergeBubbleResult,
  UiOpenBubbleResult,
  UiPendingInboxCounts,
  UiPendingInboxItemSource,
  UiPendingInboxItemType,
  ProtocolMessageType,
  UiRepoRemovedEvent,
  UiRepoSummary,
  UiRepoUpdatedEvent,
  UiRestartBubbleResult,
  UiReviewVerificationState,
  UiRuntimeHealth,
  UiRuntimeMetaReviewerPaneBinding,
  UiRuntimeSessionRecord,
  UiRuntimeSessionsSummary,
  UiSnapshotEvent,
  UiSseEventName,
  UiStartBubbleResult,
  UiStatusCommandPathView,
  UiStatusExecutionContextView,
  UiStatusPaneActivityView,
  UiStopBubbleResult,
  UiTimelineBadge,
  UiTimelineDisplayItem,
  UiTimelineDisplayRole,
  UiTimelineDisplayTag,
  UiTimelineProgress,
  UiTimelineRowKind,
  UiTimelineSummarySource,
  UiTimelineSyntheticApproval,
  UiTimelineTone,
  UiTimelineValidationFailure,
  UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as UpdateReviewPolicyActionResult
} from "@pairflow/ui-contracts";

export { bubbleLifecycleStates };
export type { BubbleLifecycleState };
export type {
  UiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution
};
export type {
  BubbleDeleteArtifacts,
  BubbleDeleteResult,
  UiApiErrorBody
};
export type {
  UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals,
  UiAttachBubbleResult,
  UiCommitBubbleResult,
  UiDeleteBubbleInput,
  UiDeleteBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitApproveInput,
  UiEmitHumanReplyInput,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkInput,
  UiEmitRequestReworkQueuedResult,
  UiEmitRequestReworkResult,
  UiMergeBubbleResult,
  UiOpenBubbleResult,
  UiRestartBubbleResult,
  UiStartBubbleResult,
  UiStopBubbleResult,
  UpdateReviewPolicyActionResult
};
/**
 * @deprecated Use UiAttachBubbleResult for UI action contract surfaces.
 */
export type AttachActionResult = CanonicalUiAttachBubbleResult;
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
};
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
  ProtocolMessageType,
  UiRepoSummary,
  UiReviewVerificationState,
  UiRuntimeHealth,
  UiRuntimeMetaReviewerPaneBinding,
  UiRuntimeSessionRecord,
  UiRuntimeSessionsSummary,
  UiStatusCommandPathView,
  UiStatusExecutionContextView,
  UiStatusPaneActivityView,
  UiTimelineBadge,
  UiTimelineDisplayItem,
  UiTimelineDisplayRole,
  UiTimelineDisplayTag,
  UiTimelineProgress,
  UiTimelineRowKind,
  UiTimelineSummarySource,
  UiTimelineSyntheticApproval,
  UiTimelineTone,
  UiTimelineValidationFailure
};

export const bubbleActionKinds = [
  "start",
  "approve",
  "request-rework",
  "reply",
  "resume",
  "update-review-policy",
  "restart",
  "commit",
  "merge",
  "open",
  "attach",
  "stop",
  "delete"
] as const;
export type BubbleActionKind = (typeof bubbleActionKinds)[number];

export type BubbleReviewAutoReworkSeverity =
  UiBubbleReviewPolicy["reviewer_blocking_min_severity"];
export type BubbleReviewLoopMode =
  UiBubbleReviewPolicy["requested_loop_mode"];
export type BubbleReviewSupportStatus =
  UiBubbleReviewPolicy["support_status"];
export type MetaReviewQualityPreset = CanonicalMetaReviewQualityPreset;
export type CommitActionInput = Omit<
  UiCommitBubbleInput,
  "bubbleId" | "repoPath" | "cwd" | "now"
>;
export type MergeActionInput = Omit<
  UiMergeBubbleInput,
  "bubbleId" | "repoPath" | "cwd" | "now"
>;
export type UpdateReviewPolicyActionInput = Omit<
  UiUpdateBubbleReviewPolicyInput,
  "bubbleId" | "repoPath" | "cwd" | "now"
>;
export type MetaReviewQualityPresetState =
  | {
      kind: "supported";
      preset: MetaReviewQualityPreset;
    }
  | {
      kind: "custom";
      severity: BubbleReviewAutoReworkSeverity;
      consecutiveCleanRunsRequired: number;
    };

export type ConnectionStatus = "idle" | "connecting" | "connected" | "stale" | "fallback";

export interface BubbleCardModel extends UiBubbleSummary {
  hasRuntimeSession: boolean;
}

export interface BubblePosition {
  x: number;
  y: number;
}
