import {
  bubbleLifecycleStates
} from "./contracts/bubbleLifecycle.js";
import type {
  BubbleLifecycleState
} from "./contracts/bubbleLifecycle.js";
import type {
  UiBubbleReviewPolicy,
  UiBubbleSummary
} from "../../../src/contracts/ui/uiReadModel.js";
import type {
  MetaReviewQualityPreset as CanonicalMetaReviewQualityPreset,
  UiCommitBubbleInput,
  UiMergeBubbleInput,
  UiUpdateBubbleReviewPolicyInput
} from "../../../src/contracts/ui/uiActions.js";

export { bubbleLifecycleStates };
export type { BubbleLifecycleState };
export type {
  UiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution
} from "./contracts/uiRemoteExecution.js";
export type {
  DeleteBubbleArtifacts as BubbleDeleteArtifacts,
  DeleteBubbleResult as BubbleDeleteResult
} from "../../../src/contracts/ui/deleteBubble.js";
export type {
  UiApiErrorBody
} from "../../../src/contracts/ui/uiErrors.js";
export type {
  AttachBubbleResult as AttachActionResult,
  UiAttachBubbleResult,
  UiCommitBubbleResult,
  UiDeleteBubbleInput,
  UiDeleteBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitApproveInput,
  UiEmitHumanReplyInput,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkInput,
  UiEmitRequestReworkResult,
  UiMergeBubbleResult,
  UiOpenBubbleResult,
  UiRestartBubbleResult,
  UiStartBubbleResult,
  UiStopBubbleResult,
  UiUpdateBubbleReviewPolicyResult as UpdateReviewPolicyActionResult
} from "../../../src/contracts/ui/uiActions.js";
export type {
  ProtocolMessageType
} from "../../../src/types/protocol.js";
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
} from "../../../src/contracts/ui/uiEvents.js";
export type {
  UiApprovalRequestGateRoute,
  UiBubbleAttention,
  UiBubbleAttentionCode,
  UiBubbleDetail,
  UiBubbleInbox,
  UiBubbleInboxItem,
  UiBubbleMetaReviewSummary,
  UiBubbleReviewPolicy,
  UiBubbleStateCounts,
  UiBubbleSummary,
  UiBubbleTranscriptSummary,
  UiBubbleWatchdog,
  UiPendingInboxCounts,
  UiPendingInboxItemSource,
  UiPendingInboxItemType,
  UiRepoSummary,
  UiRuntimeHealth,
  UiRuntimeMetaReviewerPaneBinding,
  UiRuntimeSessionRecord,
  UiTimelineEntry
} from "../../../src/contracts/ui/uiReadModel.js";

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
