import type {
  UiAttachBubbleInput,
  UiAttachBubbleResult,
  UiBubbleMutationInput,
  UiCommitBubbleInput,
  UiCommitBubbleResult,
  UiDeleteBubbleInput,
  UiDeleteBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitApproveInput,
  UiEmitHumanReplyInput,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkInput,
  UiEmitRequestReworkResult,
  UiMergeBubbleInput,
  UiMergeBubbleResult,
  UiOpenBubbleResult,
  UiRestartBubbleResult,
  UiStartBubbleResult,
  UiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult
} from "../../../contracts/ui/uiActions.js";
import type {
  UiBubbleInboxInput,
  UiBubbleInboxView,
  UiBubbleListView,
  UiBubbleStatusInput,
  UiBubbleStatusView,
  UiTimelineEntry
} from "../../../contracts/ui/uiReadModel.js";
import type {
  ReadRuntimeSessionsRegistryPort
} from "./runtimeSessions.js";

export type {
  MetaReviewQualityPreset,
  UiActionAgentName,
  UiActionAgentRole,
  UiActionApprovalDecision,
  UiActionBubbleState,
  UiActionEvent,
  UiActionExecutionContextRef,
  UiActionFindingsClaimSource,
  UiActionFindingsClaimState,
  UiActionPassIntent,
  UiActionPendingReworkIntent,
  UiActionProtocolMessageType,
  UiActionProtocolParticipant,
  UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals,
  UiAttachBubbleInput,
  UiAttachBubbleResult,
  UiAttachLauncher,
  UiBubbleMutationInput,
  UiCommitBubbleInput,
  UiCommitBubbleResult,
  UiDeleteBubbleInput,
  UiDeleteBubbleResult,
  UiDeliveryAckReasonCode,
  UiDeliveryFailureReason,
  UiDeliveryTargetReasonCode,
  UiEmitApprovalDecisionResult,
  UiEmitApproveInput,
  UiEmitHumanReplyInput,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkInput,
  UiEmitRequestReworkQueuedResult,
  UiEmitRequestReworkResult,
  UiMergeBubbleInput,
  UiMergeBubbleResult,
  UiOpenBubbleResult,
  UiPassValidationRecoveryMarkerPersistWarning,
  UiRestartBubbleResult,
  UiStartBubbleResult,
  UiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult
} from "../../../contracts/ui/uiActions.js";

export type {
  UiBubbleInboxInput,
  UiBubbleInboxView,
  UiBubbleListEntry,
  UiBubbleListStateCounts,
  UiBubbleListView,
  UiBubbleStatusInput,
  UiBubbleStatusView,
  UiTimelineEntry
} from "../../../contracts/ui/uiReadModel.js";

export interface UiBubbleListInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
  refresh?: boolean | undefined;
}

export interface UiBubbleTimelineInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface UiRouterDependencies {
  listBubbles: (input?: UiBubbleListInput) => Promise<UiBubbleListView>;
  getBubbleStatus: (
    input: UiBubbleStatusInput
  ) => Promise<UiBubbleStatusView>;
  getBubbleInbox: (
    input: UiBubbleInboxInput
  ) => Promise<UiBubbleInboxView>;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  readBubbleTimeline: (
    input: UiBubbleTimelineInput
  ) => Promise<UiTimelineEntry[]>;
  startBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiStartBubbleResult>;
  emitApprove: (
    input: UiEmitApproveInput
  ) => Promise<UiEmitApprovalDecisionResult>;
  emitRequestRework: (
    input: UiEmitRequestReworkInput
  ) => Promise<UiEmitRequestReworkResult>;
  emitHumanReply: (
    input: UiEmitHumanReplyInput
  ) => Promise<UiEmitHumanReplyResult>;
  resumeBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiEmitHumanReplyResult>;
  commitBubble: (
    input: UiCommitBubbleInput
  ) => Promise<UiCommitBubbleResult>;
  mergeBubble: (
    input: UiMergeBubbleInput
  ) => Promise<UiMergeBubbleResult>;
  openBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiOpenBubbleResult>;
  attachBubble: (
    input: UiAttachBubbleInput
  ) => Promise<UiAttachBubbleResult>;
  updateBubbleReviewPolicy: (
    input: UiUpdateBubbleReviewPolicyInput
  ) => Promise<UiUpdateBubbleReviewPolicyResult>;
  stopBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiStopBubbleResult>;
  restartBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiRestartBubbleResult>;
  deleteBubble: (
    input: UiDeleteBubbleInput
  ) => Promise<UiDeleteBubbleResult>;
}

export type UiBubbleListDependencies = Pick<
  UiRouterDependencies,
  "listBubbles"
>;

export type UiBubbleTimelineDependencies = Pick<
  UiRouterDependencies,
  "readBubbleTimeline"
>;

export interface UiBubbleDetailLoadingDependencies {
  getBubbleStatus: UiRouterDependencies["getBubbleStatus"];
  getBubbleInbox: UiRouterDependencies["getBubbleInbox"];
  readRuntimeSessionsRegistry:
    UiRouterDependencies["readRuntimeSessionsRegistry"];
}

export type UiBubbleDetailDependencies = UiBubbleDetailLoadingDependencies;

export type UiBubbleConflictEnrichmentDependencies =
  UiBubbleDetailLoadingDependencies;

export type UiBubbleActionDispatchDependencies = Pick<
  UiRouterDependencies,
  | "attachBubble"
  | "commitBubble"
  | "deleteBubble"
  | "emitApprove"
  | "emitHumanReply"
  | "emitRequestRework"
  | "mergeBubble"
  | "openBubble"
  | "restartBubble"
  | "resumeBubble"
  | "startBubble"
  | "stopBubble"
  | "updateBubbleReviewPolicy"
>;
