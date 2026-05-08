import type { BubbleLifecycleState } from "./bubbleLifecycle.js";
import type { ProtocolMessageType } from "../../types/protocol.js";
import type { StateValidationDiagnostics } from "./stateValidation.js";
import type {
  UiBubbleListRemoteExecution,
  UiBubbleRemoteExecution,
  UiBubbleStatusRemoteExecution
} from "./uiRemoteExecution.js";

export type { ProtocolMessageType };

export type UiBubbleReviewLoopMode = "full" | "meta_only";
export type UiBubbleReviewAutoReworkSeverity = "P1" | "P2" | "P3";
export type UiBubbleReviewSupportStatus = "enabled" | "guarded";
export type UiMetaReviewRecommendation = "rework" | "approve" | "inconclusive";
export type UiMetaReviewRuntimeDeliveryStatus =
  | "confirmed"
  | "uncertain"
  | "failed";
export type UiExecutionContextActiveRole =
  | "implementer"
  | "reviewer"
  | "meta_reviewer";
export type UiExecutionContextAwaitedOutputType =
  | "pass_result"
  | "meta_review_result";
export type UiWorkMode = "worktree" | "clone";
export type UiPairflowCommandProfile = "external" | "self_host";
export type UiGateSignalLevel = "warning" | "info";
export type UiGateReasonCode =
  | "DOC_CONTRACT_PARSE_WARNING"
  | "REVIEW_SCHEMA_WARNING"
  | "BLOCKER_EVIDENCE_WARNING"
  | "ROUND_GATE_WARNING"
  | "ROUND_GATE_AUTODEMOTE"
  | "STATUS_GATE_SERIALIZATION_WARNING"
  | "GATE_CONFIG_PARSE_WARNING"
  | "META_REVIEW_APPROVE_VALIDATION_FAILED"
  | "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP";
export type UiFindingPriority = "P0" | "P1" | "P2" | "P3";
export type UiFindingTiming = "required-now" | "later-hardening";
export type UiFindingLayer = "L0" | "L1" | "L2";

export interface UiBubbleFailingGate {
  gate_id: string;
  reason_code: UiGateReasonCode | (string & {});
  message: string;
  priority: UiFindingPriority;
  timing: UiFindingTiming;
  layer?: UiFindingLayer;
  evidence_refs?: string[];
  signal_level?: UiGateSignalLevel;
  effective_priority?: UiFindingPriority;
}

export interface UiBubbleSpecLockState {
  state: "LOCKED" | "IMPLEMENTABLE";
  open_blocker_count: number;
  open_required_now_count: number;
}

export interface UiBubbleRoundGateState {
  applies: boolean;
  violated: boolean;
  round: number;
  reason_code?: string;
}

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
  workspaceKind?: UiWorkMode;
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
    status: UiMetaReviewRuntimeDeliveryStatus;
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
  latestRecommendation?: UiMetaReviewRecommendation;
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
  latestRecommendation?: UiMetaReviewRecommendation;
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
  requested_loop_mode: UiBubbleReviewLoopMode;
  effective_loop_mode: UiBubbleReviewLoopMode;
  support_status: UiBubbleReviewSupportStatus;
  reviewer_blocking_min_severity: UiBubbleReviewAutoReworkSeverity;
  meta_review_auto_rework_min_severity: UiBubbleReviewAutoReworkSeverity;
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
  activeRole: UiExecutionContextActiveRole;
  awaitedOutputType: UiExecutionContextAwaitedOutputType;
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
  profile: UiPairflowCommandProfile;
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
  failing_gates: UiBubbleFailingGate[];
  spec_lock_state: UiBubbleSpecLockState;
  round_gate_state: UiBubbleRoundGateState;
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
