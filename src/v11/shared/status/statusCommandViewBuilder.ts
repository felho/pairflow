import { computeWatchdogStatus, type WatchdogStatus } from "../watchdog/watchdogStatus.js";
import { type ReviewVerificationState } from "../../../v11/shared/reviewer/reviewVerification.js";
import type { StateValidationDiagnostics } from "../ports/stateSnapshots.js";
import type { ReadWatchdogPaneActivityResult } from "../watchdog/watchdogPaneActivityStore.js";
import type {
  BubbleFailingGate,
  BubbleLifecycleState,
  BubbleReviewPolicyRuntimeView,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import {
  buildRuntimeAlignedReviewPolicyRuntimeView,
  normalizeRuntimeAlignedExecutionContext,
  normalizeRuntimeAlignedRole,
  toRuntimeAlignedReviewPolicyExecutionContext
} from "../reviewPolicy/reviewPolicyRuntime.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../../types/protocol.js";
import type { UiBubbleStatusRemoteExecution } from "../../../types/uiRemoteExecution.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "./statusCommandInternals.js";
import type { RemoteBubbleStatusSnapshot } from "./remoteBubbleStatusContract.js";
import { inferBubbleStartedAtFromInstanceId } from "../bubble/bubbleInstanceId.js";
import { toStatusCommandPathView } from "./statusCommandInternals.js";
import {
  buildStatusExecutionContextView,
  buildStatusMetaReviewView,
  buildStatusPaneActivityView,
  type StatusExecutionContextView,
  type StatusMetaReviewView,
  type StatusPaneActivityView
} from "./statusCommandViewProjection.js";

const noLiveReviewPolicyStatusStates = new Set<BubbleLifecycleState>([
  "WAITING_HUMAN",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE"
]);

function shouldProjectReviewPolicyForStatusDetail(
  state: BubbleLifecycleState
): boolean {
  return !noLiveReviewPolicyStatusStates.has(state);
}

export interface BubbleStatusView {
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
  paneActivity: StatusPaneActivityView;
  executionContext: StatusExecutionContextView | null;
  reviewPolicy?: BubbleReviewPolicyRuntimeView;
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
  remoteExecution?: UiBubbleStatusRemoteExecution;
}

type LocalBubbleStatusViewInput = {
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
  remoteExecution?: BubbleStatusView["remoteExecution"];
};

type RemoteBubbleStatusViewInput = {
  resolved: ResolvedBubbleStatusContext;
  remoteStatusSnapshot: RemoteBubbleStatusSnapshot;
  remoteExecution: NonNullable<BubbleStatusView["remoteExecution"]>;
};

function buildDegradedWatchdogStatus(input: {
  state: BubbleStatusState;
  timeoutMinutes: number;
}): WatchdogStatus {
  return {
    monitored: false,
    monitoredAgent: input.state.active_agent,
    timeoutMinutes: input.timeoutMinutes,
    referenceTimestamp: input.state.last_command_at ?? input.state.active_since,
    deadlineTimestamp: null,
    remainingSeconds: null,
    expired: false
  };
}

function buildLocalBubbleStatusView(
  input: LocalBubbleStatusViewInput
): BubbleStatusView {
  const lastMessage = input.transcript[input.transcript.length - 1] ?? null;
  const runtimeAlignedExecutionContext =
    toRuntimeAlignedReviewPolicyExecutionContext(input.state.execution_context);
  let watchdog: WatchdogStatus;
  if (input.stateValidation !== null) {
    watchdog = buildDegradedWatchdogStatus({
      state: input.state,
      timeoutMinutes: input.resolved.bubbleConfig.watchdog_timeout_minutes
    });
  } else {
    try {
      watchdog = computeWatchdogStatus(
        input.state,
        input.resolved.bubbleConfig.watchdog_timeout_minutes,
        input.now
      );
    } catch (error) {
      console.warn(
        `STATUS_WATCHDOG_DEGRADED: bubble ${input.resolved.bubbleId} watchdog projection failed; falling back to degraded status view.`,
        error
      );
      watchdog = buildDegradedWatchdogStatus({
        state: input.state,
        timeoutMinutes: input.resolved.bubbleConfig.watchdog_timeout_minutes
      });
    }
  }
  const paneActivity = buildStatusPaneActivityView(input.paneActivityRead, input.now);
  return {
    bubbleId: input.resolved.bubbleId,
    repoPath: input.resolved.repoPath,
    worktreePath: input.resolved.bubblePaths.worktreePath,
    bubbleStartedAt: inferBubbleStartedAtFromInstanceId(
      input.resolved.bubbleConfig.bubble_instance_id
    ),
    state: input.state.state,
    round: input.state.round,
    activeAgent: input.state.active_agent,
    activeRole: input.state.active_role,
    activeSince: input.state.active_since,
    lastCommandAt: input.state.last_command_at,
    paneActivity,
    executionContext: buildStatusExecutionContextView(input.state.execution_context),
    ...(shouldProjectReviewPolicyForStatusDetail(input.state.state)
      ? {
          reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
            config: input.resolved.bubbleConfig,
            round: input.state.round,
            activeRole: input.state.active_role,
            ...(runtimeAlignedExecutionContext !== null
              ? {
                  executionContext: runtimeAlignedExecutionContext
                }
              : {}),
            runtimeStateInvalid: input.stateValidation !== null
          })
        }
      : {}),
    watchdog,
    pendingInboxItems: {
      humanQuestions: input.pendingQuestions,
      approvalRequests: input.pendingApprovals,
      total: input.pendingQuestions + input.pendingApprovals
    },
    transcript: {
      totalMessages: input.transcript.length,
      lastMessageType: lastMessage?.type ?? null,
      lastMessageTs: lastMessage?.ts ?? null,
      lastMessageId: lastMessage?.id ?? null
    },
    metaReview: buildStatusMetaReviewView(input.state),
    commandPath: toStatusCommandPathView(input.resolved),
    accuracy_critical: input.accuracyCritical,
    last_review_verification: input.verificationStatus,
    failing_gates: input.gateState.failingGates,
    spec_lock_state: input.gateState.specLockState,
    round_gate_state: input.gateState.roundGateState,
    stateValidation: input.stateValidation,
    ...(input.resolved.bubbleToml !== undefined
      ? { bubbleToml: input.resolved.bubbleToml }
      : {}),
    ...(input.remoteExecution !== undefined
      ? { remoteExecution: input.remoteExecution }
      : {})
  };
}

function buildRemoteBubbleStatusView(
  input: RemoteBubbleStatusViewInput
): BubbleStatusView {
  const runtimeAlignedExecutionContext =
    normalizeRuntimeAlignedExecutionContext(
      input.remoteStatusSnapshot.executionContext
    );
  const runtimeAlignedActiveRole = normalizeRuntimeAlignedRole(
    input.remoteStatusSnapshot.activeRole
  );
  return {
    bubbleId: input.resolved.bubbleId,
    repoPath: input.resolved.repoPath,
    worktreePath: input.resolved.bubblePaths.worktreePath,
    bubbleStartedAt: input.remoteStatusSnapshot.bubbleStartedAt,
    state: input.remoteStatusSnapshot.state,
    round: input.remoteStatusSnapshot.round,
    activeAgent: input.remoteStatusSnapshot.activeAgent,
    activeRole: input.remoteStatusSnapshot.activeRole,
    activeSince: input.remoteStatusSnapshot.activeSince,
    lastCommandAt: input.remoteStatusSnapshot.lastCommandAt,
    paneActivity: input.remoteStatusSnapshot.paneActivity,
    executionContext: input.remoteStatusSnapshot.executionContext,
    ...(shouldProjectReviewPolicyForStatusDetail(input.remoteStatusSnapshot.state)
      ? {
          reviewPolicy: buildRuntimeAlignedReviewPolicyRuntimeView({
            config: input.resolved.bubbleConfig,
            round: input.remoteStatusSnapshot.round,
            activeRole: runtimeAlignedActiveRole,
            ...(runtimeAlignedExecutionContext !== null
              ? {
                  executionContext: runtimeAlignedExecutionContext
                }
              : {}),
            runtimeAvailability: input.remoteStatusSnapshot.runtimeAvailability,
            runtimeStateInvalid:
              input.remoteStatusSnapshot.stateValidation !== null
          })
        }
      : {}),
    watchdog: input.remoteStatusSnapshot.watchdog,
    pendingInboxItems: input.remoteStatusSnapshot.pendingInboxItems,
    transcript: input.remoteStatusSnapshot.transcript,
    metaReview: input.remoteStatusSnapshot.metaReview,
    commandPath: toStatusCommandPathView(input.resolved),
    accuracy_critical: input.remoteStatusSnapshot.accuracyCritical,
    last_review_verification: input.remoteStatusSnapshot.lastReviewVerification,
    failing_gates: input.remoteStatusSnapshot.failingGates,
    spec_lock_state: input.remoteStatusSnapshot.specLockState,
    round_gate_state: input.remoteStatusSnapshot.roundGateState,
    stateValidation: input.remoteStatusSnapshot.stateValidation,
    ...(input.resolved.bubbleToml !== undefined
      ? { bubbleToml: input.resolved.bubbleToml }
      : {}),
    remoteExecution: input.remoteExecution
  };
}

export function buildBubbleStatusView(
  input: LocalBubbleStatusViewInput | RemoteBubbleStatusViewInput
): BubbleStatusView {
  if ("remoteStatusSnapshot" in input) {
    return buildRemoteBubbleStatusView(input);
  }
  return buildLocalBubbleStatusView(input);
}
