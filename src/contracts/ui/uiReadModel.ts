import type {
  BubbleExecutionContext,
  BubbleFailingGate,
  BubbleLifecycleState,
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode,
  BubbleReviewSupportStatus,
  MetaReviewRecommendation,
  MetaReviewRuntimeDeliveryStatus,
  PairflowCommandProfile,
  WorkMode
} from "../../types/bubble.js";
import type { ProtocolMessageType } from "../../types/protocol.js";
import type { StateValidationDiagnostics } from "./stateValidation.js";
import type {
  UiBubbleListRemoteExecution,
  UiBubbleRemoteExecution,
  UiBubbleStatusRemoteExecution
} from "./uiRemoteExecution.js";

export type { ProtocolMessageType };

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

export type UiBubbleListStateCounts = UiBubbleStateCounts;

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

export interface UiBubbleInboxInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface UiBubbleInboxView {
  bubbleId: string;
  repoPath: string;
  state: BubbleLifecycleState;
  pending: UiPendingInboxCounts;
  items: UiPendingInboxItemSource[];
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

export interface UiBubbleListEntry {
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
  attention: UiBubbleAttention | null;
  reviewPolicy?: UiBubbleReviewPolicy;
  metaReview: UiBubbleMetaReviewSummary;
  remoteExecution?: UiBubbleListRemoteExecution;
}

export interface UiRuntimeSessionsSummary {
  registered: number;
  stale: number;
}

export interface UiBubbleDetail extends UiBubbleSummary {
  bubbleToml: string | null;
  watchdog: UiBubbleWatchdog;
  pendingInboxItems: UiPendingInboxCounts;
  inbox: UiBubbleInbox;
  transcript: UiBubbleTranscriptSummary;
}

export interface UiBubbleListView {
  repoPath: string;
  total: number;
  byState: UiBubbleListStateCounts;
  runtimeSessions: UiRuntimeSessionsSummary;
  bubbles: UiBubbleListEntry[];
  remoteExecutionSummary?: {
    createdNotStarted: number;
    unavailableStarted: number;
    refreshedThisRun?: boolean;
  };
}

export type UiReviewVerificationState =
  | "pass"
  | "fail"
  | "missing"
  | "invalid";

export interface UiStatusPaneActivityView {
  readStatus: "ok" | "missing" | "invalid";
  lastChangedAt: string | null;
  sampledAt: string | null;
  sinceLastChangedSeconds: number | null;
  sinceSampledSeconds: number | null;
  lastSampleStatus: "sampled" | "no_session" | "pane_unreadable" | null;
  lastSampleError: string | null;
  sessionName: string | null;
  targetPane: string | null;
}

export interface UiStatusExecutionContextView {
  activeRole: BubbleExecutionContext["active_role"];
  awaitedOutputType: BubbleExecutionContext["awaited_output_type"];
  handoffId: string;
  executionId: string;
  round: number;
  startedAt: string;
  deadlineAt: string;
  attempt: number;
}

export interface UiStatusCommandPathView {
  status: "worktree_local" | "external" | "stale" | "missing" | "unknown";
  reasonCode?:
    | "PAIRFLOW_COMMAND_PATH_STALE"
    | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
  profile: PairflowCommandProfile;
  localEntrypoint: string;
  activeEntrypoint: string | null;
  message: string;
  pinnedCommand: string;
}

export interface UiBubbleStatusInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface UiBubbleStatusView {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  bubbleToml?: string | undefined;
  bubbleStartedAt: string | null;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  paneActivity: UiStatusPaneActivityView;
  executionContext: UiStatusExecutionContextView | null;
  reviewPolicy?: UiBubbleReviewPolicy;
  watchdog: UiBubbleWatchdog;
  pendingInboxItems: UiPendingInboxCounts;
  transcript: UiBubbleTranscriptSummary;
  metaReview: UiBubbleMetaReviewSummary;
  commandPath: UiStatusCommandPathView;
  accuracy_critical: boolean;
  last_review_verification: UiReviewVerificationState;
  failing_gates: BubbleFailingGate[];
  spec_lock_state: BubbleSpecLockState;
  round_gate_state: BubbleRoundGateState;
  stateValidation: StateValidationDiagnostics | null;
  remoteExecution?: UiBubbleStatusRemoteExecution;
}

export interface UiRepoSummary {
  repoPath: string;
  total: number;
  byState: UiBubbleStateCounts;
  runtimeSessions: UiRuntimeSessionsSummary;
  remoteExecutionSummary?: {
    createdNotStarted: number;
    unavailableStarted: number;
    refreshedThisRun?: boolean;
  };
}

export type UiTimelineTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type UiTimelineSummarySource =
  | "summary"
  | "question"
  | "message"
  | "decision"
  | "neutral";

export type UiTimelineDisplayRole =
  | "implementer"
  | "reviewer"
  | "meta_reviewer"
  | "human"
  | "system"
  | "unknown";

export type UiTimelineRowKind =
  | "normal"
  | "handoff"
  | "approval"
  | "blocked"
  | "gate_failure";

export interface UiTimelineBadge {
  kind: "finding" | "decision" | "recommendation" | "status";
  label: string;
  tone: UiTimelineTone;
}

export type UiTimelineProgress =
  | {
      kind: "meta_review_handoff";
      label: string;
      handoffAttempt: number;
    }
  | {
      kind: "clean_run";
      label: string;
      cleanRunCount: number;
      cleanRunsRequired: number | null;
    };

export interface UiTimelineValidationFailure {
  summaryText: string;
  tone: "neutral" | "warning" | "danger";
}

export interface UiTimelineSyntheticApproval {
  kind: "meta_review_approval";
  sourceEntryId: string;
  syntheticEntryId: string;
  label: string;
  tone: "success";
}

export interface UiTimelineDisplayTag {
  label: string;
  tone: UiTimelineTone;
}

export interface UiTimelineDisplayItem {
  id: string;
  sourceEntryId: string;
  ts: string;
  round: number;
  role: UiTimelineDisplayRole;
  senderLabel: string;
  title: string;
  summaryText: string;
  tone: UiTimelineTone;
  badges: UiTimelineBadge[];
  cleanRunTag: UiTimelineDisplayTag | null;
  gateFailed: boolean;
  blocked: boolean;
  convergence: boolean;
}
