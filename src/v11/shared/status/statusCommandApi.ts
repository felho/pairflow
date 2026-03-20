import { computeWatchdogStatus, type WatchdogStatus } from "../../../core/runtime/watchdog.js";
import { BubbleLookupError, resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { type ReviewVerificationState } from "../../../core/reviewer/reviewVerification.js";
import {
  countPendingHumanQuestions,
  readStatusTranscriptData,
  resolvePendingApprovalCount,
  resolveReviewVerificationState,
  resolveStatusGateState,
  toStatusCommandPathView,
  type BubbleStatusState,
  type ResolvedBubbleStatusContext,
  type StatusGateState,
  withAccuracyCriticalVerificationGate
} from "./statusCommandInternals.js";
import type {
  BubbleFailingGate,
  BubbleLifecycleState,
  MetaReviewRecommendation,
  MetaReviewRunStatus,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../../types/protocol.js";

export interface BubbleStatusInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

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
}

export class BubbleStatusError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleStatusError";
  }
}

function buildBubbleStatusView({
  resolved,
  state,
  transcript,
  pendingQuestions,
  pendingApprovals,
  accuracyCritical,
  verificationStatus,
  gateState,
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
  now: Date;
}): BubbleStatusView {
  const lastMessage = transcript[transcript.length - 1] ?? null;
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
    watchdog: computeWatchdogStatus(
      state,
      resolved.bubbleConfig.watchdog_timeout_minutes,
      now
    ),
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
    round_gate_state: gateState.roundGateState
  };
}

export async function getBubbleStatus(input: BubbleStatusInput): Promise<BubbleStatusView> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const { state, transcript, inbox } = await readStatusTranscriptData(resolved);
  const pendingQuestions = countPendingHumanQuestions(inbox);
  const pendingApprovals = resolvePendingApprovalCount(resolved, state, inbox);
  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const verificationStatus = await resolveReviewVerificationState(
    resolved,
    state,
    accuracyCritical
  );
  const gateState = await resolveStatusGateState(resolved, state.round);
  gateState.failingGates = withAccuracyCriticalVerificationGate(
    gateState.failingGates,
    accuracyCritical,
    verificationStatus
  );

  return buildBubbleStatusView({
    resolved,
    state,
    transcript,
    pendingQuestions,
    pendingApprovals,
    accuracyCritical,
    verificationStatus,
    gateState,
    now: input.now ?? new Date()
  });
}

export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleStatusError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleStatusError(
      `${error.message} context: command_name=status.`
    );
  }
  if (error instanceof Error) {
    throw new BubbleStatusError(
      `${error.message} context: command_name=status.`
    );
  }
  throw error;
}
