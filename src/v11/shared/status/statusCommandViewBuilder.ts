import { computeWatchdogStatus, type WatchdogStatus } from "../watchdog/watchdogStatus.js";
import { type ReviewVerificationState } from "../../../v11/shared/reviewer/reviewVerification.js";
import type { StateValidationDiagnostics } from "../ports/stateSnapshots.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type {
  BubbleFailingGate,
  BubbleLifecycleState,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../../types/protocol.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "./statusCommandInternals.js";
import { toStatusCommandPathView } from "./statusCommandInternals.js";
import {
  buildStatusExecutionContextView,
  buildStatusMetaReviewView,
  buildStatusPaneActivityView,
  type StatusExecutionContextView,
  type StatusMetaReviewView,
  type StatusPaneActivityView
} from "./statusCommandViewProjection.js";

export interface BubbleStatusView {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  bubbleStartedAt: string | null;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  paneActivity: StatusPaneActivityView;
  executionContext: StatusExecutionContextView | null;
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
  metaReview: StatusMetaReviewView;
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
  paneActivityRead,
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
  paneActivityRead: ReadWatchdogPaneActivityResult;
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
  const paneActivity = buildStatusPaneActivityView(paneActivityRead, now);
  return {
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    worktreePath: resolved.bubblePaths.worktreePath,
    bubbleStartedAt: inferBubbleStartedAtFromInstanceId(
      resolved.bubbleConfig.bubble_instance_id
    ),
    state: state.state,
    round: state.round,
    activeAgent: state.active_agent,
    activeRole: state.active_role,
    activeSince: state.active_since,
    lastCommandAt: state.last_command_at,
    paneActivity,
    executionContext: buildStatusExecutionContextView(state.execution_context),
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
    metaReview: buildStatusMetaReviewView(state, transcript),
    commandPath: toStatusCommandPathView(resolved),
    accuracy_critical: accuracyCritical,
    last_review_verification: verificationStatus,
    failing_gates: gateState.failingGates,
    spec_lock_state: gateState.specLockState,
    round_gate_state: gateState.roundGateState,
    stateValidation
  };
}

function inferBubbleStartedAtFromInstanceId(
  bubbleInstanceId: string | undefined
): string | null {
  if (bubbleInstanceId === undefined) {
    return null;
  }

  const segments = bubbleInstanceId.split("_");
  if (segments.length < 3 || segments[0] !== "bi") {
    return null;
  }

  const encodedTimestamp = segments[1];
  if (encodedTimestamp === undefined || !/^[0-9a-z]+$/u.test(encodedTimestamp)) {
    return null;
  }

  const timestampMs = Number.parseInt(encodedTimestamp, 36);
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0) {
    return null;
  }

  const startedAt = new Date(timestampMs);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  return startedAt.toISOString();
}
