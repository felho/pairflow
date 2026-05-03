import type {
  AttachLauncher,
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode,
  BubbleStateSnapshot
} from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";
import type { DeleteBubbleResult } from "./deleteBubble.js";
import type { UiBubbleReviewPolicy } from "./uiReadModel.js";

export type MetaReviewQualityPreset = "P1" | "P2" | "P3" | "P3+1" | "P3+2";

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

export interface UiApprovalDecisionDeliverySignals {
  statusDelivery: UiApprovalDecisionDeliverySignal;
  implementerDelivery?: UiApprovalDecisionDeliverySignal;
}

export type UiApprovalDecisionDeliverySignal =
  | {
    status: "accepted";
    message: string;
    sessionName?: string;
    targetPaneIndex?: number;
    deliveryTargetReasonCode?: UiDeliveryTargetReasonCode;
    reason?: never;
    reason_code?: never;
  }
  | {
    status: "rejected";
    message: string;
    reason?: UiDeliveryFailureReason;
    reason_code?: UiDeliveryAckReasonCode;
    sessionName?: string;
    targetPaneIndex?: number;
    deliveryTargetReasonCode?: UiDeliveryTargetReasonCode;
  };

export type UiDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "command_failed";

export type UiDeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

export type UiDeliveryAckReasonCode =
  | "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
  | "DELIVERY_ACK_TARGET_UNSUPPORTED"
  | "DELIVERY_ACK_REJECTED";

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

export interface UiCommitBubbleInput extends UiBubbleMutationInput {
  refs?: string[] | undefined;
  message?: string | undefined;
  stageAll: boolean;
}

export interface UiCommitBubbleResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}

export interface UiMergeBubbleInput extends UiBubbleMutationInput {
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
}

export interface UiMergeBubbleResult {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  presentationRoute: "local" | "started_remote";
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export interface UiOpenBubbleResult {
  bubbleId: string;
  workspaceKind: "local_worktree" | "remote_clone";
  workspacePath: string;
  worktreePath?: string | undefined;
  remoteAuthority?: string | undefined;
  command: string;
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
  warnings?: UiPassValidationRecoveryMarkerPersistWarning[] | undefined;
}

export interface UiPassValidationRecoveryMarkerPersistWarning {
  reason_code: "pass_validation_recovery_marker_persist_failed";
  message: string;
  metadata: {
    flow: "restart" | "reconcile";
    marker_scope: "repo" | "worktree";
    target_path_kind: "repo_runtime_marker" | "worktree_marker";
    target_path_exists: boolean;
    error_code?: string;
    failed_targets: string[];
    persisted_targets: string[];
    repo_marker_path: string;
    worktree_marker_path?: string;
    worktreePathRequested: boolean;
  };
}

export interface UiAttachBubbleResult {
  bubbleId: string;
  tmuxSessionName: string;
  launcherRequested: AttachLauncher;
  launcherUsed: UiAttachLauncher;
  attachCommand?: string;
  diagnostics?: Array<{
    code: "REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE";
    message: string;
    context: {
      bubbleId?: string;
      cwd?: string;
      reason?: string;
      repoPath?: string;
      tmuxSessionName?: string;
      remoteAlias?: string;
      remoteHost?: string;
      remoteClonePath?: string;
    };
  }>;
}

export type UiAttachLauncher = Exclude<AttachLauncher, "auto">;

export interface UiAttachBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export type AttachBubbleResult = UiAttachBubbleResult;

export interface UiUpdateBubbleReviewPolicyInput extends UiBubbleMutationInput {
  reviewLoopMode: BubbleReviewLoopMode;
  reviewBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  metaReviewQualityPreset?: MetaReviewQualityPreset;
  expectedBubbleToml?: string | undefined;
}

export interface UiUpdateBubbleReviewPolicyResult {
  kind: "review_policy_updated";
  bubbleId: string;
  reviewPolicy: UiBubbleReviewPolicy;
  previousRequestedLoopMode: BubbleReviewLoopMode;
  nextRequestedLoopMode: BubbleReviewLoopMode;
  activationChange: "none";
  bubbleToml: string;
}

export interface UiDeleteBubbleInput extends UiBubbleMutationInput {
  force?: boolean | undefined;
}

export type UiDeleteBubbleResult = DeleteBubbleResult;
