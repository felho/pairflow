import {
  bubbleLifecycleStates
} from "./contracts/bubbleLifecycle.js";
import type {
  BubbleLifecycleState
} from "./contracts/bubbleLifecycle.js";
import type { StateValidationDiagnostics } from "./contracts/stateValidation.js";
import type { UiBubbleRemoteExecution } from "./contracts/uiRemoteExecution.js";
import type { MetaReviewGateRoute as BackendMetaReviewGateRoute } from "../../../src/v11/shared/metaReviewGate/metaReviewGateTypes.js";
export { bubbleLifecycleStates };
export type { BubbleLifecycleState };
export type {
  UiBubbleListRemoteExecution,
  UiBubbleStatusRemoteExecution
} from "./contracts/uiRemoteExecution.js";
export const protocolMessageTypes = [
  "TASK",
  "PASS",
  "HUMAN_QUESTION",
  "HUMAN_REPLY",
  "CONVERGENCE",
  "APPROVAL_REQUEST",
  "APPROVAL_DECISION",
  "DONE_PACKAGE"
] as const;
export type ProtocolMessageType = (typeof protocolMessageTypes)[number];

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

// Mirrors src/contracts/deleteBubble.ts.
// Keep these interfaces in sync with the backend delete-bubble contract.
export interface BubbleDeleteArtifacts {
  worktree: {
    exists: boolean;
    path: string;
  };
  tmux: {
    exists: boolean;
    sessionName: string;
  };
  runtimeSession: {
    exists: boolean;
    sessionName: string | null;
  };
  branch: {
    exists: boolean;
    name: string;
  };
}

export interface BubbleDeleteResult {
  bubbleId: string;
  deleted: boolean;
  requiresConfirmation: boolean;
  artifacts: BubbleDeleteArtifacts;
  tmuxSessionTerminated: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export interface RuntimeSessionRecord {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  updatedAt: string;
  metaReviewerPane?: {
    role: "meta-reviewer";
    paneIndex: number;
    active: boolean;
    runId: string | null;
    updatedAt: string;
  };
}

export interface UiRuntimeHealth {
  expected: boolean;
  present: boolean;
  stale: boolean;
}

export type UiBubbleAttentionCode =
  | "state_invalid"
  | "runtime_missing"
  | "startup_incomplete"
  | "runtime_mismatch"
  | "no_session"
  | "pane_unreadable"
  | "pane_activity_invalid"
  | "watchdog_expired"
  | "quiet_pane";

export interface UiBubbleAttention {
  code: UiBubbleAttentionCode;
  severity: "warning" | "critical";
  label: string;
  detail?: string;
}

export interface UiPendingInboxCounts {
  humanQuestions: number;
  approvalRequests: number;
  total: number;
}

export type UiPendingInboxItemType = "HUMAN_QUESTION" | "APPROVAL_REQUEST";
export type UiApprovalRequestRecommendation = "rework" | "approve" | "inconclusive";
export const uiApprovalRequestGateRoutes = [
  "meta_review_running",
  "auto_rework",
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_threshold_not_met",
  "human_gate_threshold_unresolved",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
] as const satisfies readonly BackendMetaReviewGateRoute[];
export type UiApprovalRequestGateRoute = (typeof uiApprovalRequestGateRoutes)[number];

export interface UiBubbleInboxItem {
  envelopeId: string;
  type: UiPendingInboxItemType;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
  latestRecommendation?: UiApprovalRequestRecommendation;
  gateRoute?: UiApprovalRequestGateRoute;
}

export interface UiBubbleInbox {
  pending: UiPendingInboxCounts;
  items: UiBubbleInboxItem[];
}

export interface UiBubbleWatchdog {
  monitored: boolean;
  monitoredAgent: string | null;
  timeoutMinutes: number;
  referenceTimestamp: string | null;
  deadlineTimestamp: string | null;
  remainingSeconds: number | null;
  expired: boolean;
}

export interface UiBubbleTranscriptSummary {
  totalMessages: number;
  lastMessageType: ProtocolMessageType | null;
  lastMessageTs: string | null;
  lastMessageId: string | null;
}

export type MetaReviewRuntimeDeliveryStatus = "confirmed" | "uncertain" | "failed";
export type BubbleReviewAutoReworkSeverity = "P1" | "P2" | "P3";

export interface UiBubbleMetaReviewSummary {
  actor: "meta-reviewer";
  authorityActive: boolean;
  consecutiveCleanRuns: number;
  runtimeDelivery: {
    status: MetaReviewRuntimeDeliveryStatus;
    reasonCode: string | null;
    message: string;
    observedAt: string;
    observedForHandoffId: string | null;
    observedForRound: number | null;
  } | null;
}

export type BubbleReviewLoopMode = "full" | "meta_only";
export type BubbleReviewSupportStatus = "enabled" | "guarded";
export type MetaReviewQualityPreset = "P1" | "P2" | "P3" | "P3+1" | "P3+2";
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

export interface UiBubbleReviewPolicy {
  requested_loop_mode: BubbleReviewLoopMode;
  effective_loop_mode: BubbleReviewLoopMode;
  support_status: BubbleReviewSupportStatus;
  reviewer_blocking_min_severity: BubbleReviewAutoReworkSeverity;
  meta_review_auto_rework_min_severity: BubbleReviewAutoReworkSeverity;
  meta_review_consecutive_clean_runs_required: number;
  blocked_reason_code?: string;
  blocked_prerequisites?: string[];
  provenance_note?: string;
}

export interface UiBubbleSummary {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  stateValidation: StateValidationDiagnostics | null;
  runtimeSession: RuntimeSessionRecord | null;
  runtime: UiRuntimeHealth;
  attention: UiBubbleAttention | null;
  reviewPolicy: UiBubbleReviewPolicy | null;
  metaReview: UiBubbleMetaReviewSummary;
  remoteExecution?: UiBubbleRemoteExecution;
}

export interface UiRepoSummary {
  repoPath: string;
  total: number;
  byState: {
    CREATED: number;
    PREPARING_WORKSPACE: number;
    RUNNING: number;
    WAITING_HUMAN: number;
    READY_FOR_HUMAN_APPROVAL: number;
    APPROVED_FOR_COMMIT: number;
    COMMITTED: number;
    DONE: number;
    FAILED: number;
    CANCELLED: number;
  };
  runtimeSessions: {
    registered: number;
    stale: number;
  };
  remoteExecutionSummary?: {
    createdNotStarted: number;
    unavailableStarted: number;
    refreshedThisRun?: boolean;
  };
}

export interface UiApiErrorBody {
  error: {
    code: "bad_request" | "not_found" | "conflict" | "internal_error";
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface UiBubbleDetail extends UiBubbleSummary {
  bubbleToml: string | null;
  watchdog: UiBubbleWatchdog;
  pendingInboxItems: UiPendingInboxCounts;
  inbox: UiBubbleInbox;
  transcript: UiBubbleTranscriptSummary;
}

export interface UiTimelineEntry {
  id: string;
  ts: string;
  round: number;
  type: ProtocolMessageType;
  sender: string;
  recipient: string;
  payload: Record<string, unknown>;
  refs: string[];
}

export interface UiEventBase {
  id: number;
  ts: string;
}

export interface UiBubbleUpdatedEvent extends UiEventBase {
  type: "bubble.updated";
  repoPath: string;
  bubbleId: string;
  bubble: UiBubbleSummary;
}

export interface UiBubbleRemovedEvent extends UiEventBase {
  type: "bubble.removed";
  repoPath: string;
  bubbleId: string;
}

export interface UiRepoUpdatedEvent extends UiEventBase {
  type: "repo.updated";
  repoPath: string;
  repo: UiRepoSummary;
}

export interface UiSnapshotEvent {
  id: number;
  ts: string;
  type: "snapshot";
  repos: UiRepoSummary[];
  bubbles: UiBubbleSummary[];
}

export type UiEvent =
  | UiBubbleUpdatedEvent
  | UiBubbleRemovedEvent
  | UiRepoUpdatedEvent
  | UiSnapshotEvent;

export type ConnectionStatus = "idle" | "connecting" | "connected" | "stale" | "fallback";

export interface BubbleCardModel extends UiBubbleSummary {
  hasRuntimeSession: boolean;
}

export interface CommitActionInput {
  stageAll: boolean;
  message?: string;
  refs?: string[];
}

export interface MergeActionInput {
  push?: boolean;
  deleteRemote?: boolean;
}

export interface UpdateReviewPolicyActionInput {
  reviewLoopMode: BubbleReviewLoopMode;
  reviewBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  metaReviewQualityPreset?: MetaReviewQualityPreset;
  expectedBubbleToml?: string;
}

export interface UpdateReviewPolicyActionResult {
  kind: "review_policy_updated";
  bubbleId: string;
  reviewPolicy: UiBubbleReviewPolicy;
  previousRequestedLoopMode: BubbleReviewLoopMode;
  nextRequestedLoopMode: BubbleReviewLoopMode;
  activationChange: "none";
  bubbleToml: string;
}

export interface AttachActionResult {
  bubbleId: string;
  tmuxSessionName: string;
  launcherRequested: string;
  launcherUsed: string;
  attachCommand?: string;
  diagnostics?: Array<{
    code: string;
    message: string;
    context?: Record<string, unknown>;
  }>;
}

export interface BubblePosition {
  x: number;
  y: number;
}
