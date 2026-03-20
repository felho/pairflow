import { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { computeWatchdogStatus, type WatchdogStatus } from "../../../core/runtime/watchdog.js";
import { assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { BubbleLookupError, resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { readReviewVerificationArtifactStatus, type ReviewVerificationState } from "../../../core/reviewer/reviewVerification.js";
import {
  collectFailingGatesFromArtifact,
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../core/gates/docContractGates.js";
import { resolveCanonicalPendingApprovalSignal } from "../../../core/bubble/pendingApprovalSignal.js";
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

function countPendingHumanQuestions(envelopes: ProtocolEnvelope[]): number {
  let pending = 0;
  for (const envelope of envelopes) {
    if (envelope.type === "HUMAN_QUESTION") {
      pending += 1;
      continue;
    }
    if (envelope.type === "HUMAN_REPLY") {
      // Defensive clamp: inbox events are append-only in normal flow, but if logs
      // are edited/reordered manually we still keep pending count non-negative.
      pending = Math.max(0, pending - 1);
    }
  }
  return pending;
}

type ResolvedBubbleStatusContext = Awaited<ReturnType<typeof resolveBubbleById>>;

interface StatusGateState {
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
}

function defaultGateState(round: number): StatusGateState {
  return {
    failingGates: [],
    specLockState: {
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    },
    roundGateState: {
      applies: false,
      violated: false,
      round
    }
  };
}

function toStatusSerializationWarning(reason: string): BubbleFailingGate {
  return {
    gate_id: "status.serialization",
    reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
    message: `Status gate artifact parse failed; using fallback defaults. ${reason}`,
    priority: "P2",
    timing: "later-hardening",
    layer: "L1",
    signal_level: "warning"
  };
}

function withAccuracyCriticalVerificationGate(
  failingGates: BubbleFailingGate[],
  accuracyCritical: boolean,
  verificationStatus: ReviewVerificationState
): BubbleFailingGate[] {
  if (!accuracyCritical || verificationStatus === "pass") {
    return failingGates;
  }
  return [
    ...failingGates,
    {
      gate_id: "accuracy_critical.review_verification",
      reason_code: `ACCURACY_CRITICAL_REVIEW_VERIFICATION_${verificationStatus.toUpperCase()}`,
      message: `Accuracy-critical review verification status is ${verificationStatus}.`,
      priority: "P1",
      timing: "required-now",
      layer: "L1",
      signal_level: "warning"
    }
  ];
}

function resolvePendingApprovalCount(
  resolved: ResolvedBubbleStatusContext,
  state: Awaited<ReturnType<typeof readStateSnapshot>>["state"],
  inbox: ProtocolEnvelope[]
): number {
  return resolveCanonicalPendingApprovalSignal({
    bubbleId: resolved.bubbleId,
    state: state.state,
    round: state.round,
    metaReview: state.meta_review,
    envelopes: inbox
  }) === undefined
    ? 0
    : 1;
}

async function resolveReviewVerificationState(
  resolved: ResolvedBubbleStatusContext,
  state: Awaited<ReturnType<typeof readStateSnapshot>>["state"],
  accuracyCritical: boolean
): Promise<ReviewVerificationState> {
  if (!accuracyCritical) {
    return "missing";
  }
  const verification = await readReviewVerificationArtifactStatus(
    resolved.bubblePaths.reviewVerificationArtifactPath,
    {
      expectedRound: state.round,
      expectedReviewer: resolved.bubbleConfig.agents.reviewer
    }
  );
  return verification.status;
}

async function resolveStatusGateState(
  resolved: ResolvedBubbleStatusContext,
  round: number
): Promise<StatusGateState> {
  const defaults = defaultGateState(round);
  const docGateScopeActive = isDocContractGateScopeActive({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type
  });
  if (!docGateScopeActive) {
    return defaults;
  }

  try {
    const gateArtifact = await readDocContractGateArtifact(
      resolveDocContractGateArtifactPath(resolved.bubblePaths.artifactsDir)
    );
    if (gateArtifact === undefined) {
      return defaults;
    }
    return {
      failingGates: collectFailingGatesFromArtifact(gateArtifact),
      specLockState: gateArtifact.spec_lock_state,
      roundGateState: gateArtifact.round_gate_state
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ...defaults,
      failingGates: [toStatusSerializationWarning(reason)]
    };
  }
}

async function readStatusTranscriptData(
  resolved: ResolvedBubbleStatusContext
): Promise<{
  state: Awaited<ReturnType<typeof readStateSnapshot>>["state"];
  transcript: ProtocolEnvelope[];
  inbox: ProtocolEnvelope[];
}> {
  const [{ state }, transcript, inbox] = await Promise.all([
    readStateSnapshot(resolved.bubblePaths.statePath),
    readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }),
    readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    })
  ]);
  return { state, transcript, inbox };
}

function toStatusCommandPathView(
  resolved: ResolvedBubbleStatusContext
): BubbleStatusView["commandPath"] {
  const commandPath = assessPairflowCommandPath({
    worktreePath: resolved.bubblePaths.worktreePath,
    profile: resolved.bubbleConfig.pairflow_command_profile,
    activeEntrypoint: process.argv[1]
  });
  return {
    status: commandPath.status,
    ...(commandPath.reasonCode !== undefined
      ? { reasonCode: commandPath.reasonCode }
      : {}),
    profile: commandPath.profile,
    localEntrypoint: commandPath.localEntrypoint,
    activeEntrypoint: commandPath.activeEntrypoint,
    message: commandPath.message,
    pinnedCommand: commandPath.pinnedCommand
  };
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
  state: Awaited<ReturnType<typeof readStateSnapshot>>["state"];
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
