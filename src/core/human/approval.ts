import { join } from "node:path";

import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "../bubble/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "./reworkIntent.js";
import type {
  AgentName,
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type ApprovalDecision,
  type ProtocolEnvelope
} from "../../types/protocol.js";
import type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkInput,
  EmitRequestReworkResult
} from "../../v11/application/approval/approvalCommandContract.js";
import {
  ApprovalCommandError,
  createApprovalCommandError,
  isApprovalCommandError
} from "../../v11/shared/approval/approvalCommandError.js";
import { normalizeApprovalCommandError } from "../../v11/shared/approval/approvalCommandErrorNormalization.js";
import {
  normalizeApprovalDecisionInput,
  normalizeRequestReworkInput
} from "../../v11/shared/approval/approvalCommandInputNormalization.js";
export type {
  EmitApprovalDecisionDependencies,
  EmitApprovalDecisionInput,
  EmitApprovalDecisionResult,
  EmitApproveInput,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkInput,
  EmitRequestReworkQueuedResult,
  EmitRequestReworkResult
} from "../../v11/application/approval/approvalCommandContract.js";
export { ApprovalCommandError } from "../../v11/shared/approval/approvalCommandError.js";

const canonicalHumanApprovalState = "READY_FOR_HUMAN_APPROVAL" as const;
const legacyHumanApprovalState = "READY_FOR_APPROVAL" as const;
const metaReviewFailedHumanState = "META_REVIEW_FAILED" as const;
const approvalOverrideRequiredReasonCode = "APPROVAL_OVERRIDE_REQUIRED";
const approvalOverrideReasonRequiredReasonCode =
  "APPROVAL_OVERRIDE_REASON_REQUIRED";
const approvalRecommendationUnavailableReasonCode =
  "APPROVAL_RECOMMENDATION_UNAVAILABLE";
const approvalParityOverrideRequiredReasonCode = "APPROVAL_PARITY_OVERRIDE_REQUIRED";
const metaReviewRunFailedSummaryPrefix = "META_REVIEW_GATE_RUN_FAILED:";
const metaReviewGateRunFailedReasonCode = "META_REVIEW_GATE_RUN_FAILED";
const metaReviewGateRouteMetadataKey = "meta_review_gate_route";
const metaReviewGateReasonCodeMetadataKey = "meta_review_gate_reason_code";
const metaReviewGateRunFailedMetadataKey = "meta_review_gate_run_failed";

interface ApprovalTranscriptContext {
  latestRoundApprovalRequest?: ProtocolEnvelope;
  hasRunFailedApprovalRequestHistory: boolean;
}

function isHumanApprovalState(
  state: BubbleStateSnapshot["state"]
): state is
  | typeof canonicalHumanApprovalState
  | typeof legacyHumanApprovalState
  | typeof metaReviewFailedHumanState {
  return (
    state === canonicalHumanApprovalState ||
    state === legacyHumanApprovalState ||
    state === metaReviewFailedHumanState
  );
}

function resolveNextState(
  state: BubbleStateSnapshot,
  decision: ApprovalDecision,
  nowIso: string,
  implementer: AgentName,
  reviewer: AgentName
): BubbleStateSnapshot {
  if (decision === "approve") {
    return applyStateTransition(state, {
      to: "APPROVED_FOR_COMMIT",
      lastCommandAt: nowIso
    });
  }

  const nextRound = state.round + 1;
  return applyStateTransition(state, {
    to: "RUNNING",
    round: nextRound,
    activeAgent: implementer,
    activeRole: "implementer",
    activeSince: nowIso,
    lastCommandAt: nowIso,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer,
      reviewer,
      switched_at: nowIso
    }
  });
}

function resolveLatestApprovalRecommendation(
  state: BubbleStateSnapshot,
  context?: ApprovalTranscriptContext
): MetaReviewRecommendation {
  const isCompatibilityLegacyWithMetaReview =
    state.state === legacyHumanApprovalState && state.meta_review !== undefined;
  if (
    state.state === legacyHumanApprovalState &&
    state.meta_review === undefined
  ) {
    // Legacy compatibility path: bubbles created before Phase 3 may not have
    // meta_review snapshot data yet. Preserve prior READY_FOR_APPROVAL behavior.
    return "approve";
  }
  const recommendation = state.meta_review?.last_autonomous_recommendation ?? null;
  if (
    recommendation === "approve" ||
    recommendation === "rework" ||
    recommendation === "inconclusive"
  ) {
    return recommendation;
  }
  if (state.state === metaReviewFailedHumanState) {
    return "inconclusive";
  }
  if (
    (state.state === canonicalHumanApprovalState || isCompatibilityLegacyWithMetaReview) &&
    state.meta_review?.sticky_human_gate === true
  ) {
    if (context === undefined) {
      return "inconclusive";
    }
    if (
      isRunFailedApprovalRequest(context.latestRoundApprovalRequest) ||
      context.hasRunFailedApprovalRequestHistory
    ) {
      return "inconclusive";
    }
    if (isCompatibilityLegacyWithMetaReview) {
      return "inconclusive";
    }
    if (
      state.state === canonicalHumanApprovalState
      && context.latestRoundApprovalRequest !== undefined
    ) {
      return "inconclusive";
    }
    if (state.state === canonicalHumanApprovalState) {
      return "inconclusive";
    }
  }
  throw new ApprovalCommandError(
    `${approvalRecommendationUnavailableReasonCode}: latest autonomous recommendation is unavailable at approval time.`
  );
}

function isHumanApprovalRequest(envelope: ProtocolEnvelope): boolean {
  return (
    envelope.type === "APPROVAL_REQUEST" &&
    envelope.sender === "orchestrator" &&
    envelope.recipient === "human"
  );
}

function isRunFailedApprovalRequest(
  approvalRequest: ProtocolEnvelope | undefined
): boolean {
  if (approvalRequest === undefined || !isHumanApprovalRequest(approvalRequest)) {
    return false;
  }
  const metadata = approvalRequest.payload.metadata;
  if (typeof metadata === "object" && metadata !== null) {
    const gateMetadata = metadata as Record<string, unknown>;
    if (gateMetadata[metaReviewGateRunFailedMetadataKey] === true) {
      return true;
    }
    if (gateMetadata[metaReviewGateRouteMetadataKey] === "human_gate_run_failed") {
      return true;
    }
    if (gateMetadata[metaReviewGateReasonCodeMetadataKey] === metaReviewGateRunFailedReasonCode) {
      return true;
    }
  }
  const summary = approvalRequest.payload.summary;
  return (
    typeof summary === "string" &&
    summary.startsWith(metaReviewRunFailedSummaryPrefix)
  );
}

function hasParityInconsistencyMetadata(
  approvalRequest: ProtocolEnvelope | undefined
): boolean {
  if (approvalRequest === undefined || !isHumanApprovalRequest(approvalRequest)) {
    return false;
  }
  const metadata = approvalRequest.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return false;
  }
  const parityMetadata = metadata as Record<string, unknown>;
  const parityStatus = parityMetadata.findings_parity_status;
  if (parityStatus === "mismatch" || parityStatus === "guard_failed") {
    return true;
  }
  const claimed = parityMetadata.findings_claimed_open_total;
  const artifact = parityMetadata.findings_artifact_open_total;
  const hasClaimed =
    typeof claimed === "number" && Number.isInteger(claimed) && claimed >= 0;
  const hasArtifact =
    typeof artifact === "number"
    && Number.isInteger(artifact)
    && artifact >= 0;
  if (hasClaimed && hasArtifact) {
    return claimed !== artifact;
  }
  return false;
}

async function readApprovalTranscriptContext(
  transcriptPath: string,
  round: number
): Promise<ApprovalTranscriptContext> {
  const transcript = await readTranscriptEnvelopes(transcriptPath, {
    allowMissing: true
  });
  let latestRoundApprovalRequest: ProtocolEnvelope | undefined;
  let hasRunFailedApprovalRequestHistory = false;
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index];
    if (envelope === undefined || !isHumanApprovalRequest(envelope)) {
      continue;
    }
    if (
      latestRoundApprovalRequest === undefined &&
      envelope.round === round
    ) {
      latestRoundApprovalRequest = envelope;
    }
    if (envelope.round === round && isRunFailedApprovalRequest(envelope)) {
      hasRunFailedApprovalRequestHistory = true;
    }
    if (
      latestRoundApprovalRequest !== undefined &&
      hasRunFailedApprovalRequestHistory
    ) {
      break;
    }
  }
  return {
    ...(latestRoundApprovalRequest !== undefined
      ? { latestRoundApprovalRequest }
      : {}),
    hasRunFailedApprovalRequestHistory
  }
}

export async function emitApprovalDecision(
  input: EmitApprovalDecisionInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitApprovalDecisionResult> {
  const normalizedInput = normalizeApprovalDecisionInput({
    ...input,
    createApprovalCommandError
  });
  const now = normalizedInput.now;
  const nowIso = now.toISOString();
  const refs = normalizedInput.refs;
  const overrideReason = normalizedInput.overrideReason;
  const message = normalizedInput.message;

  const resolved = await resolveBubbleById({
    bubbleId: normalizedInput.bubbleId,
    ...(normalizedInput.repoPath !== undefined
      ? { repoPath: normalizedInput.repoPath }
      : {}),
    ...(normalizedInput.cwd !== undefined ? { cwd: normalizedInput.cwd } : {})
  });
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (!isHumanApprovalState(state.state)) {
    throw new ApprovalCommandError(
      `approval decision can only be used while bubble is ${canonicalHumanApprovalState} or ${metaReviewFailedHumanState} (legacy compatibility: ${legacyHumanApprovalState}) (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw new ApprovalCommandError(
      `${state.state} state must have round >= 1 (found ${state.round}).`
    );
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const envelopePayload: ProtocolEnvelope["payload"] = {
    decision: normalizedInput.decision
  };
  const envelopeMetadata: Record<string, unknown> = {
    [deliveryTargetRoleMetadataKey]: "status"
  };
  if (normalizedInput.decision === "approve") {
    const approvalTranscriptContext = await readApprovalTranscriptContext(
      resolved.bubblePaths.transcriptPath,
      state.round
    );
    const recommendationAtDecision = resolveLatestApprovalRecommendation(
      state,
      approvalTranscriptContext
    );
    envelopeMetadata.recommendation_at_decision = recommendationAtDecision;
    const parityInconsistencyAtDecision = hasParityInconsistencyMetadata(
      approvalTranscriptContext?.latestRoundApprovalRequest
    );
    if (parityInconsistencyAtDecision) {
      envelopeMetadata.findings_parity_inconsistent = true;
    }

    const overrideRequired =
      recommendationAtDecision !== "approve" || parityInconsistencyAtDecision;
    if (overrideRequired) {
      if (normalizedInput.overrideNonApprove !== true) {
        throw new ApprovalCommandError(
          parityInconsistencyAtDecision
            ? `${approvalParityOverrideRequiredReasonCode}: approval requires --override-non-approve when findings parity metadata is inconsistent.`
            : `${approvalOverrideRequiredReasonCode}: approval requires --override-non-approve when latest recommendation is ${recommendationAtDecision}.`
        );
      }
      if (overrideReason === undefined) {
        throw new ApprovalCommandError(
          parityInconsistencyAtDecision
            ? `${approvalOverrideReasonRequiredReasonCode}: approval override requires --override-reason when findings parity metadata is inconsistent.`
            : `${approvalOverrideReasonRequiredReasonCode}: approval override requires --override-reason when latest recommendation is ${recommendationAtDecision}.`
        );
      }
      envelopeMetadata.override_non_approve = true;
      envelopeMetadata.override_reason = overrideReason;
    }
  }
  if (message !== undefined) {
    envelopePayload.message = message;
  }
  if (Object.keys(envelopeMetadata).length > 0) {
    envelopePayload.metadata = envelopeMetadata;
  }

  const appended = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    mirrorPaths: [resolved.bubblePaths.inboxPath],
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: "human",
      recipient: "orchestrator",
      type: "APPROVAL_DECISION",
      round: state.round,
      payload: envelopePayload,
      refs
    }
  });

  const nextState = resolveNextState(
    state,
    normalizedInput.decision,
    nowIso,
    resolved.bubbleConfig.agents.implementer,
    resolved.bubbleConfig.agents.reviewer
  );

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: state.state
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ApprovalCommandError(
      `APPROVAL_DECISION ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitDelivery({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: resolved.bubbleId,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope
    })
  });
  if (normalizedInput.decision === "revise") {
    const decisionMessageRef = resolveDeliveryMessageRef({
      bubbleId: resolved.bubbleId,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: appended.envelope
    });
    // Rework requests must reach the implementer pane explicitly, otherwise
    // a human-gate -> RUNNING transition can remain invisible in practice.
    const existingDeliveryMetadata =
      typeof appended.envelope.payload.metadata === "object" &&
      appended.envelope.payload.metadata !== null
        ? appended.envelope.payload.metadata
        : {};
    void emitDelivery({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: {
        ...appended.envelope,
        recipient: resolved.bubbleConfig.agents.implementer,
        payload: {
          ...appended.envelope.payload,
          metadata: {
            ...existingDeliveryMetadata,
            [deliveryTargetRoleMetadataKey]: "implementer"
          }
        }
      },
      messageRef: decisionMessageRef
    });
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType:
      normalizedInput.decision === "approve"
        ? "bubble_approved"
        : "bubble_rework_requested",
    round: state.round,
    actorRole: "human",
    metadata: {
      decision: normalizedInput.decision,
      refs_count: refs.length,
      has_message: message !== undefined,
      message_length:
        message === undefined ? 0 : Array.from(message).length
    },
    now
  });

  return {
    bubbleId: resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state
  };
}

export async function emitApprove(
  input: EmitApproveInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitApprovalDecisionResult> {
  return emitApprovalDecision({
    bubbleId: input.bubbleId,
    decision: "approve",
    overrideNonApprove: input.overrideNonApprove,
    overrideReason: input.overrideReason,
    refs: input.refs,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now
  }, dependencies);
}

export async function emitRequestRework(
  input: EmitRequestReworkInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitRequestReworkResult> {
  const normalizedInput = normalizeRequestReworkInput({
    ...input,
    createApprovalCommandError
  });
  const message = normalizedInput.message;
  const now = normalizedInput.now;
  const refs = normalizedInput.refs;

  const resolved = await resolveBubbleById({
    bubbleId: normalizedInput.bubbleId,
    ...(normalizedInput.repoPath !== undefined
      ? { repoPath: normalizedInput.repoPath }
      : {}),
    ...(normalizedInput.cwd !== undefined
      ? { cwd: normalizedInput.cwd }
      : {})
  });
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (isHumanApprovalState(state.state)) {
    const immediate = await emitApprovalDecision(
      {
        bubbleId: normalizedInput.bubbleId,
        decision: "revise",
        message,
        refs,
        repoPath: normalizedInput.repoPath,
        cwd: normalizedInput.cwd,
        now
      },
      dependencies
    );
    return {
      ...immediate,
      mode: "immediate"
    };
  }

  if (state.state !== "WAITING_HUMAN") {
    throw new ApprovalCommandError(
      `bubble request-rework can only be used while bubble is ${canonicalHumanApprovalState}, ${metaReviewFailedHumanState} (legacy compatibility: ${legacyHumanApprovalState}) or WAITING_HUMAN (current: ${state.state}).`
    );
  }

  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const queued = queueDeferredReworkIntent({
    state,
    message,
    refs,
    requestedBy: "human:request-rework",
    now
  });

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, queued.state, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "WAITING_HUMAN"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ApprovalCommandError(
      `Deferred rework intent ${queued.intent.intent_id} was queued in-memory but state update failed. Root error: ${reason}`
    );
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "rework_intent_queued",
    round: state.round,
    actorRole: "human",
    metadata: {
      intent_id: queued.intent.intent_id,
      requested_by: queued.intent.requested_by,
      requested_at: queued.intent.requested_at,
      state_at_request: state.state,
      refs_count: refs.length,
      message_length: Array.from(message).length
    },
    now
  });

  if (queued.supersededIntentId !== undefined) {
    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "rework_intent_superseded",
      round: state.round,
      actorRole: "human",
      metadata: {
        intent_id: queued.supersededIntentId,
        superseded_by_intent_id: queued.intent.intent_id,
        requested_by: queued.intent.requested_by,
        requested_at: queued.intent.requested_at,
        state_at_request: state.state
      },
      now
    });
  }

  return {
    mode: "queued",
    bubbleId: resolved.bubbleId,
    intentId: queued.intent.intent_id,
    ...(queued.supersededIntentId !== undefined
      ? { supersededIntentId: queued.supersededIntentId }
      : {}),
    state: written.state
  };
}

export function asApprovalCommandError(error: unknown): never {
  throw normalizeApprovalCommandError({
    error,
    isApprovalCommandError,
    createApprovalCommandError,
    isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError
  });
}
