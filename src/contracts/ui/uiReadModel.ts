import type {
  BubbleLifecycleState,
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode,
  BubbleReviewSupportStatus,
  MetaReviewRecommendation,
  MetaReviewRuntimeDeliveryStatus,
  WorkMode
} from "../../types/bubble.js";
import type {
  ProtocolEnvelopePayload,
  ProtocolMessageType
} from "../../types/protocol.js";
import type { StateValidationDiagnostics } from "./stateValidation.js";
import type { UiBubbleRemoteExecution } from "./uiRemoteExecution.js";

export interface UiBubbleStateCounts {
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
}

export interface UiRuntimeHealth {
  expected: boolean;
  present: boolean;
  stale: boolean;
}

export interface UiRuntimeMetaReviewerPaneBinding {
  role: "meta-reviewer";
  paneIndex: number;
  active: boolean;
  updatedAt: string;
}

export interface UiRuntimeSessionRecord {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  workspacePath?: string;
  workspaceKind?: WorkMode;
  tmuxSessionName: string;
  updatedAt: string;
  metaReviewerPane?: UiRuntimeMetaReviewerPaneBinding;
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

export interface UiPendingInboxCounts {
  humanQuestions: number;
  approvalRequests: number;
  total: number;
}

export type UiPendingInboxItemType = "HUMAN_QUESTION" | "APPROVAL_REQUEST";

export type UiPendingInboxItemSource = {
  envelopeId: string;
  type: UiPendingInboxItemType;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
  latestRecommendation?: MetaReviewRecommendation;
  gateRoute?: UiApprovalRequestGateRoute;
};

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
] as const;

export type UiApprovalRequestGateRoute =
  (typeof uiApprovalRequestGateRoutes)[number];

export interface UiBubbleInboxItem {
  envelopeId: string;
  type: UiPendingInboxItemType;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
  latestRecommendation?: MetaReviewRecommendation;
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

export interface UiBubbleTranscriptSummary {
  totalMessages: number;
  lastMessageType: ProtocolMessageType | null;
  lastMessageTs: string | null;
  lastMessageId: string | null;
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
  runtimeSession: UiRuntimeSessionRecord | null;
  runtime: UiRuntimeHealth;
  attention: UiBubbleAttention | null;
  reviewPolicy: UiBubbleReviewPolicy | null;
  metaReview: UiBubbleMetaReviewSummary;
  remoteExecution?: UiBubbleRemoteExecution;
}

export interface UiBubbleDetail extends UiBubbleSummary {
  bubbleToml: string | null;
  watchdog: UiBubbleWatchdog;
  pendingInboxItems: UiPendingInboxCounts;
  inbox: UiBubbleInbox;
  transcript: UiBubbleTranscriptSummary;
}

export interface UiRepoSummary {
  repoPath: string;
  total: number;
  byState: UiBubbleStateCounts;
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

export interface UiTimelineEntry {
  id: string;
  ts: string;
  round: number;
  type: ProtocolMessageType;
  sender: string;
  recipient: string;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}
