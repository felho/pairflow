import { computeWatchdogStatus, type WatchdogStatus } from "../../../core/runtime/watchdog.js";
import { type ReviewVerificationState } from "../../../core/reviewer/reviewVerification.js";
import type { StateValidationDiagnostics } from "../../../core/state/stateStore.js";
import type {
  BubbleFailingGate,
  BubbleLifecycleState,
  BubbleRoundGateState,
  BubbleSpecLockState,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../../types/protocol.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "./statusCommandInternals.js";
import { toStatusCommandPathView } from "./statusCommandInternals.js";

export interface BubbleStatusView {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  watchdog: WatchdogStatus;
  pendingInboxItems: {
    humanQuestions: number;
    approvalRequests: number;
    total: number;
  };
  transcript: {
    totalMessages: number;
    lastMessageType: ProtocolMessageType | null;
    lastMessageTs: string | null;
    lastMessageId: string | null;
  };
  metaReview: {
    actor: "meta-reviewer";
    latestRecommendation: MetaReviewRecommendation | null;
    latestStatus: MetaReviewRunStatus | null;
    latestSummary: string | null;
    latestReportRef: string | null;
    latestUpdatedAt: string | null;
  };
  commandPath: {
    status: "worktree_local" | "external" | "stale" | "missing" | "unknown";
    reasonCode?:
      | "PAIRFLOW_COMMAND_PATH_STALE"
      | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
      | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
    profile: "external" | "self_host";
    localEntrypoint: string;
    activeEntrypoint: string | null;
    message: string;
    pinnedCommand: string;
  };
  accuracy_critical: boolean;
  last_review_verification: ReviewVerificationState;
  failing_gates: BubbleFailingGate[];
  spec_lock_state: BubbleSpecLockState;
  round_gate_state: BubbleRoundGateState;
  stateValidation: StateValidationDiagnostics | null;
}

export function buildBubbleStatusView({
  resolved,
  state,
  transcript,
  pendingQuestions,
  pendingApprovals,
  accuracyCritical,
  verificationStatus,
  gateState,
  stateValidation,
  now
}: {
  resolved: ResolvedBubbleStatusContext;
  state: BubbleStatusState;
  transcript: ProtocolEnvelope[];
  pendingQuestions: number;
  pendingApprovals: number;
  accuracyCritical: boolean;
  verificationStatus: ReviewVerificationState;
  gateState: StatusGateState;
  stateValidation: StateValidationDiagnostics | null;
  now: Date;
}): BubbleStatusView {
  const lastMessage = transcript[transcript.length - 1] ?? null;
  const watchdog =
    stateValidation === null
      ? computeWatchdogStatus(
          state,
          resolved.bubbleConfig.watchdog_timeout_minutes,
          now
        )
      : {
          monitored: false,
          monitoredAgent: state.active_agent,
          timeoutMinutes: resolved.bubbleConfig.watchdog_timeout_minutes,
          referenceTimestamp: state.last_command_at ?? state.active_since,
          deadlineTimestamp: null,
          remainingSeconds: null,
          expired: false
        };
  return {
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    worktreePath: resolved.bubblePaths.worktreePath,
    state: state.state,
    round: state.round,
    activeAgent: state.active_agent,
    activeRole: state.active_role,
    activeSince: state.active_since,
    lastCommandAt: state.last_command_at,
    watchdog,
    pendingInboxItems: {
      humanQuestions: pendingQuestions,
      approvalRequests: pendingApprovals,
      total: pendingQuestions + pendingApprovals
    },
    transcript: {
      totalMessages: transcript.length,
      lastMessageType: lastMessage?.type ?? null,
      lastMessageTs: lastMessage?.ts ?? null,
      lastMessageId: lastMessage?.id ?? null
    },
    metaReview: {
      actor: "meta-reviewer",
      latestRecommendation: state.meta_review?.last_autonomous_recommendation ?? null,
      latestStatus: state.meta_review?.last_autonomous_status ?? null,
      latestSummary: state.meta_review?.last_autonomous_summary ?? null,
      latestReportRef: state.meta_review?.last_autonomous_report_ref ?? null,
      latestUpdatedAt: state.meta_review?.last_autonomous_updated_at ?? null
    },
    commandPath: toStatusCommandPathView(resolved),
    accuracy_critical: accuracyCritical,
    last_review_verification: verificationStatus,
    failing_gates: gateState.failingGates,
    spec_lock_state: gateState.specLockState,
    round_gate_state: gateState.roundGateState,
    stateValidation
  };
}
