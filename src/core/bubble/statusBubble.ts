import { readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { computeWatchdogStatus, type WatchdogStatus } from "../runtime/watchdog.js";
import { assessPairflowCommandPath } from "../runtime/pairflowCommand.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { readReviewVerificationArtifactStatus, type ReviewVerificationState } from "../reviewer/reviewVerification.js";
import {
  collectFailingGatesFromArtifact,
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGates.js";
import { resolveCanonicalPendingApprovalSignal } from "./pendingApprovalSignal.js";
import type {
  BubbleFailingGate,
  BubbleLifecycleState,
  MetaReviewRecommendation,
  MetaReviewRunStatus,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolMessageType } from "../../types/protocol.js";

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
    status: "worktree_local" | "stale";
    reasonCode?: "PAIRFLOW_COMMAND_PATH_STALE";
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

export async function getBubbleStatus(input: BubbleStatusInput): Promise<BubbleStatusView> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const [{ state }, transcript, inbox] = await Promise.all([
    readStateSnapshot(resolved.bubblePaths.statePath),
    readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
      allowMissing: true
    }),
    readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true
    })
  ]);

  const lastMessage = transcript[transcript.length - 1] ?? null;
  const pendingQuestions = countPendingHumanQuestions(inbox);
  const pendingApprovals =
    resolveCanonicalPendingApprovalSignal({
      bubbleId: resolved.bubbleId,
      state: state.state,
      round: state.round,
      metaReview: state.meta_review,
      envelopes: inbox
    }) === undefined
      ? 0
      : 1;
  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const verification = accuracyCritical
    ? await readReviewVerificationArtifactStatus(
      resolved.bubblePaths.reviewVerificationArtifactPath,
      {
        expectedRound: state.round,
        expectedReviewer: resolved.bubbleConfig.agents.reviewer
      }
    )
    : { status: "missing" as const };
  const defaultSpecLockState: BubbleSpecLockState = {
    state: "IMPLEMENTABLE",
    open_blocker_count: 0,
    open_required_now_count: 0
  };
  const defaultRoundGateState: BubbleRoundGateState = {
    applies: false,
    violated: false,
    round: state.round
  };
  let failingGates: BubbleFailingGate[] = [];
  let specLockState = defaultSpecLockState;
  let roundGateState = defaultRoundGateState;
  const docGateScopeActive = isDocContractGateScopeActive({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type
  });
  if (docGateScopeActive) {
    try {
      const gateArtifact = await readDocContractGateArtifact(
        resolveDocContractGateArtifactPath(resolved.bubblePaths.artifactsDir)
      );
      if (gateArtifact !== undefined) {
        failingGates = collectFailingGatesFromArtifact(gateArtifact);
        specLockState = gateArtifact.spec_lock_state;
        roundGateState = gateArtifact.round_gate_state;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failingGates.push({
        gate_id: "status.serialization",
        reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
        message: `Status gate artifact parse failed; using fallback defaults. ${reason}`,
        priority: "P2",
        timing: "later-hardening",
        layer: "L1",
        signal_level: "warning"
      });
    }
  }

  if (accuracyCritical && verification.status !== "pass") {
    failingGates = [
      ...failingGates,
      {
        gate_id: "accuracy_critical.review_verification",
        reason_code: `ACCURACY_CRITICAL_REVIEW_VERIFICATION_${verification.status.toUpperCase()}`,
        message: `Accuracy-critical review verification status is ${verification.status}.`,
        priority: "P1",
        timing: "required-now",
        layer: "L1",
        signal_level: "warning"
      }
    ];
  }

  const commandPath = assessPairflowCommandPath({
    worktreePath: resolved.bubblePaths.worktreePath,
    activeEntrypoint: process.argv[1]
  });

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
      input.now ?? new Date()
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
    commandPath: {
      status: commandPath.status,
      ...(commandPath.reasonCode !== undefined
        ? { reasonCode: commandPath.reasonCode }
        : {}),
      localEntrypoint: commandPath.localEntrypoint,
      activeEntrypoint: commandPath.activeEntrypoint,
      message: commandPath.message,
      pinnedCommand: commandPath.pinnedCommand
    },
    accuracy_critical: accuracyCritical,
    last_review_verification: accuracyCritical ? verification.status : "missing",
    failing_gates: failingGates,
    spec_lock_state: specLockState,
    round_gate_state: roundGateState
  };
}

export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleStatusError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleStatusError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleStatusError(error.message);
  }
  throw error;
}
