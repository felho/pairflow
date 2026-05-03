import type {
  BubbleLifecycleState
} from "../../../types/bubble.js";
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
import type { UiTimelineEntry } from "../../../contracts/ui/uiReadModel.js";
import type { BubbleListEntry } from "../list/listCommandContract.js";
import type {
  BubbleInboxInput,
  BubbleInboxView
} from "../inbox/inboxCommandApi.js";
import type {
  BubbleStatusInput,
  BubbleStatusView
} from "../status/statusCommandApi.js";
import type {
  ReadRuntimeSessionsRegistryPort
} from "./runtimeSessions.js";

export type {
  AttachBubbleResult,
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

export interface UiBubbleListInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
  refresh?: boolean | undefined;
}

export type UiBubbleListStateCounts = Record<BubbleLifecycleState, number>;

export type UiBubbleListEntry = BubbleListEntry;

export interface UiBubbleListView {
  repoPath: string;
  total: number;
  byState: UiBubbleListStateCounts;
  runtimeSessions: {
    registered: number;
    stale: number;
  };
  bubbles: UiBubbleListEntry[];
  remoteExecutionSummary?: {
    createdNotStarted: number;
    unavailableStarted: number;
    refreshedThisRun?: boolean;
  };
}

export interface UiBubbleTimelineInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface UiRouterDependencies {
  listBubbles: (input?: UiBubbleListInput) => Promise<UiBubbleListView>;
  getBubbleStatus: (
    input: BubbleStatusInput
  ) => Promise<BubbleStatusView>;
  getBubbleInbox: (
    input: BubbleInboxInput
  ) => Promise<BubbleInboxView>;
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
