import type { DeleteBubbleResult } from "../../../contracts/deleteBubble.js";
import type {
  BubbleLifecycleState,
  AttachLauncher,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { UiTimelineEntry } from "../../../types/ui.js";
import type { BubbleListEntry } from "../list/listCommandContract.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  BubbleInboxInput,
  BubbleInboxView
} from "../inbox/inboxCommandApi.js";
import type {
  BubbleStatusInput,
  BubbleStatusView
} from "../status/statusCommandApi.js";
import type {
  UiApprovalDecisionDeliverySignals
} from "./uiDelivery.js";
import type {
  ReadRuntimeSessionsRegistryPort
} from "./runtimeSessions.js";
import type {
  PassValidationRecoveryMarkerPersistWarning
} from "./passValidationRecovery.js";

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

export interface UiBubbleMutationInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface UiEmitApproveInput extends UiBubbleMutationInput {
  refs?: string[] | undefined;
  overrideNonApprove?: boolean | undefined;
  overrideReason?: string | undefined;
}

export interface UiEmitApprovalDecisionResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: UiApprovalDecisionDeliverySignals;
}

export interface UiEmitRequestReworkImmediateResult
  extends UiEmitApprovalDecisionResult {
  mode: "immediate";
}

export interface UiEmitRequestReworkQueuedResult {
  mode: "queued";
  bubbleId: string;
  intentId: string;
  state: BubbleStateSnapshot;
  supersededIntentId?: string;
}

export type UiEmitRequestReworkResult =
  | UiEmitRequestReworkImmediateResult
  | UiEmitRequestReworkQueuedResult;

export interface UiEmitRequestReworkInput extends UiBubbleMutationInput {
  message: string;
  refs?: string[] | undefined;
}

export interface UiEmitHumanReplyInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
  now?: Date;
  message: string;
  refs?: string[];
}

export interface UiEmitHumanReplyResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export interface UiCommitBubbleResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
  donePackagePath: string;
}

export interface UiCommitBubbleInput extends UiBubbleMutationInput {
  refs?: string[] | undefined;
  message?: string | undefined;
  auto?: boolean | undefined;
}

export interface UiMergeBubbleResult {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export interface UiMergeBubbleInput extends UiBubbleMutationInput {
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
}

export interface UiOpenBubbleResult {
  bubbleId: string;
  worktreePath: string;
  command: string;
}

export interface UiDeleteBubbleInput extends UiBubbleMutationInput {
  force?: boolean | undefined;
}

export interface UiStartBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  worktreePath: string;
}

export interface UiStopBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

export interface UiRestartBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  worktreePath: string;
  previousTmuxSessionExisted: boolean;
  previousRuntimeSessionRemoved: boolean;
  warnings?: PassValidationRecoveryMarkerPersistWarning[] | undefined;
}

export type UiAttachLauncher = Exclude<AttachLauncher, "auto">;

export interface UiAttachBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface UiAttachBubbleResult {
  bubbleId: string;
  tmuxSessionName: string;
  launcherRequested: AttachLauncher;
  launcherUsed: AttachLauncher;
  attachCommand?: string;
}

export type AttachBubbleResult = UiAttachBubbleResult;

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
  stopBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiStopBubbleResult>;
  restartBubble: (
    input: UiBubbleMutationInput
  ) => Promise<UiRestartBubbleResult>;
  deleteBubble: (
    input: UiDeleteBubbleInput
  ) => Promise<DeleteBubbleResult>;
}
