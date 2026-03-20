import { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { readReviewVerificationArtifactStatus, type ReviewVerificationState } from "../../../core/reviewer/reviewVerification.js";
import {
  collectFailingGatesFromArtifact,
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../core/gates/docContractGates.js";
import { resolveCanonicalPendingApprovalSignal } from "../../../core/bubble/pendingApprovalSignal.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export type ResolvedBubbleStatusContext = Awaited<ReturnType<typeof resolveBubbleById>>;
export type BubbleStatusState = Awaited<ReturnType<typeof readStateSnapshot>>["state"];

export interface StatusGateState {
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
}

export function countPendingHumanQuestions(envelopes: ProtocolEnvelope[]): number {
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

export function withAccuracyCriticalVerificationGate(
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

export function resolvePendingApprovalCount(
  resolved: ResolvedBubbleStatusContext,
  state: BubbleStatusState,
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

export async function resolveReviewVerificationState(
  resolved: ResolvedBubbleStatusContext,
  state: BubbleStatusState,
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

export async function resolveStatusGateState(
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

export async function readStatusTranscriptData(
  resolved: ResolvedBubbleStatusContext
): Promise<{
  state: BubbleStatusState;
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

export function toStatusCommandPathView(
  resolved: ResolvedBubbleStatusContext
): {
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
} {
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
