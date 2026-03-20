import { join } from "node:path";

import { deliveryTargetRoleMetadataKey, type ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
import {
  mapImmediateReworkResult,
  mapQueuedReworkResult,
  resolveApprovalNextState
} from "./approvalResultMapping.js";
import type {
  NormalizedApprovalDecisionInput,
  NormalizedRequestReworkInput
} from "../../shared/approval/approvalCommandInputNormalization.js";
import type {
  ResolvedApprovalCommandDependencies
} from "../../shared/approval/approvalCommandDependencyResolution.js";
import {
  appendEnvelopeViaMutationBoundary,
  persistStateViaMutationBoundary
} from "../../shared/mutation/mutationBoundaryIO.js";
import {
  assertApprovalDecisionEligibility,
  canonicalHumanApprovalState,
  isHumanApprovalState,
  legacyHumanApprovalState,
  metaReviewFailedHumanState,
  resolveApprovalDecisionMetadata
} from "../../shared/approval/approvalRoutingEligibility.js";

export interface RunApprovalDecisionFlowInput extends NormalizedApprovalDecisionInput {
  createError: (message: string) => Error;
}

export interface RunRequestReworkFlowInput extends NormalizedRequestReworkInput {
  createError: (message: string) => Error;
}

async function buildApprovalDecisionEnvelopePayload(input: {
  decision: RunApprovalDecisionFlowInput["decision"];
  message: RunApprovalDecisionFlowInput["message"];
  overrideNonApprove: RunApprovalDecisionFlowInput["overrideNonApprove"];
  overrideReason: RunApprovalDecisionFlowInput["overrideReason"];
  state: Parameters<typeof resolveApprovalDecisionMetadata>[0]["state"];
  transcriptPath: string;
  round: number;
  readTranscriptEnvelopes: ResolvedApprovalCommandDependencies["readTranscriptEnvelopes"];
  createError: RunApprovalDecisionFlowInput["createError"];
}): Promise<ProtocolEnvelope["payload"]> {
  const envelopePayload: ProtocolEnvelope["payload"] = {
    decision: input.decision
  };
  const envelopeMetadata = await resolveApprovalDecisionMetadata({
    decision: input.decision,
    state: input.state,
    transcriptPath: input.transcriptPath,
    round: input.round,
    overrideNonApprove: input.overrideNonApprove,
    overrideReason: input.overrideReason,
    readTranscriptEnvelopes: input.readTranscriptEnvelopes,
    createError: input.createError
  });

  if (input.message !== undefined) {
    envelopePayload.message = input.message;
  }
  if (Object.keys(envelopeMetadata).length > 0) {
    envelopePayload.metadata = envelopeMetadata;
  }

  return envelopePayload;
}

function emitApprovalDecisionDeliverySignals(input: {
  decision: RunApprovalDecisionFlowInput["decision"];
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  appendedEnvelope: ProtocolEnvelope;
  messageRef: string;
  dependencies: ResolvedApprovalCommandDependencies;
}): void {
  // Optional UX signal; never block protocol/state progression on notification failure.
  void input.dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.resolved.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.appendedEnvelope,
    messageRef: input.messageRef
  });

  if (input.decision !== "revise") {
    return;
  }

  // Rework requests must reach the implementer pane explicitly, otherwise
  // a human-gate -> RUNNING transition can remain invisible in practice.
  const existingDeliveryMetadata =
    typeof input.appendedEnvelope.payload.metadata === "object" &&
    input.appendedEnvelope.payload.metadata !== null
      ? input.appendedEnvelope.payload.metadata
      : {};
  void input.dependencies.emitTmuxDeliveryNotification({
    bubbleId: input.resolved.bubbleId,
    bubbleConfig: input.resolved.bubbleConfig,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: {
      ...input.appendedEnvelope,
      recipient: input.resolved.bubbleConfig.agents.implementer,
      payload: {
        ...input.appendedEnvelope.payload,
        metadata: {
          ...existingDeliveryMetadata,
          [deliveryTargetRoleMetadataKey]: "implementer"
        }
      }
    },
    messageRef: input.messageRef
  });
}

async function emitApprovalDecisionLifecycleEvent(input: {
  decision: RunApprovalDecisionFlowInput["decision"];
  refsCount: number;
  message: RunApprovalDecisionFlowInput["message"];
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  bubbleInstanceId: string;
  round: number;
  now: Date;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<void> {
  await input.dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.resolved.repoPath,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType:
      input.decision === "approve"
        ? "bubble_approved"
        : "bubble_rework_requested",
    round: input.round,
    actorRole: "human",
    metadata: {
      decision: input.decision,
      refs_count: input.refsCount,
      has_message: input.message !== undefined,
      message_length:
        input.message === undefined ? 0 : Array.from(input.message).length
    },
    now: input.now
  });
}

export async function runApprovalDecisionFlow(
  input: RunApprovalDecisionFlowInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitApprovalDecisionResult> {
  const nowIso = input.now.toISOString();
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const bubbleIdentity = await dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await dependencies.readStateSnapshot(
    resolved.bubblePaths.statePath
  );
  const state = loadedState.state;

  assertApprovalDecisionEligibility(state, input.createError);

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const envelopePayload = await buildApprovalDecisionEnvelopePayload({
    decision: input.decision,
    message: input.message,
    overrideNonApprove: input.overrideNonApprove,
    overrideReason: input.overrideReason,
    state,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    round: state.round,
    readTranscriptEnvelopes: dependencies.readTranscriptEnvelopes,
    createError: input.createError
  });

  const appended = await appendEnvelopeViaMutationBoundary({
    append: dependencies.appendProtocolEnvelope,
    payload: {
      transcriptPath: resolved.bubblePaths.transcriptPath,
      mirrorPaths: [resolved.bubblePaths.inboxPath],
      lockPath,
      now: input.now,
      envelope: {
        bubble_id: resolved.bubbleId,
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: state.round,
        payload: envelopePayload,
        refs: input.refs
      }
    }
  });

  const nextState = resolveApprovalNextState({
    state,
    decision: input.decision,
    nowIso,
    implementer: resolved.bubbleConfig.agents.implementer,
    reviewer: resolved.bubbleConfig.agents.reviewer,
    applyStateTransition: dependencies.applyStateTransition
  });

  let written;
  try {
    written = await persistStateViaMutationBoundary({
      write: dependencies.writeStateSnapshot,
      statePath: resolved.bubblePaths.statePath,
      state: nextState,
      options: {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: state.state
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw input.createError(
      `APPROVAL_DECISION ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  const decisionMessageRef = dependencies.resolveDeliveryMessageRef({
    bubbleId: resolved.bubbleId,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });

  emitApprovalDecisionDeliverySignals({
    decision: input.decision,
    resolved,
    appendedEnvelope: appended.envelope,
    messageRef: decisionMessageRef,
    dependencies
  });

  await emitApprovalDecisionLifecycleEvent({
    decision: input.decision,
    refsCount: input.refs.length,
    message: input.message,
    resolved,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    round: state.round,
    now: input.now,
    dependencies
  });

  return {
    bubbleId: resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state
  };
}

export async function runRequestReworkFlow(
  input: RunRequestReworkFlowInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitRequestReworkResult> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await dependencies.readStateSnapshot(
    resolved.bubblePaths.statePath
  );
  const state = loadedState.state;

  if (isHumanApprovalState(state.state)) {
    const immediate = await runApprovalDecisionFlow(
      {
        bubbleId: input.bubbleId,
        decision: "revise",
        message: input.message,
        refs: input.refs,
        repoPath: input.repoPath,
        cwd: input.cwd,
        now: input.now,
        createError: input.createError
      },
      dependencies
    );
    return mapImmediateReworkResult(immediate);
  }

  if (state.state !== "WAITING_HUMAN") {
    throw input.createError(
      `bubble request-rework can only be used while bubble is ${canonicalHumanApprovalState}, ${metaReviewFailedHumanState} (legacy compatibility: ${legacyHumanApprovalState}) or WAITING_HUMAN (current: ${state.state}).`
    );
  }

  const bubbleIdentity = await dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const queued = dependencies.queueDeferredReworkIntent({
    state,
    message: input.message,
    refs: input.refs,
    requestedBy: "human:request-rework",
    now: input.now
  });
  // Deferred rework intent mutates intent metadata only; lifecycle state
  // remains WAITING_HUMAN under the existing eligibility guard.

  let written;
  try {
    written = await persistStateViaMutationBoundary({
      write: dependencies.writeStateSnapshot,
      statePath: resolved.bubblePaths.statePath,
      state: queued.state,
      options: {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw input.createError(
      `Deferred rework intent ${queued.intent.intent_id} was queued in-memory but state update failed. Root error: ${reason}`
    );
  }

  await dependencies.emitBubbleLifecycleEventBestEffort({
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
      refs_count: input.refs.length,
      message_length: Array.from(input.message).length
    },
    now: input.now
  });

  if (queued.supersededIntentId !== undefined) {
    await dependencies.emitBubbleLifecycleEventBestEffort({
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
      now: input.now
    });
  }

  return mapQueuedReworkResult({
    bubbleId: resolved.bubbleId,
    state: written.state,
    intent: queued.intent,
    supersededIntentId: queued.supersededIntentId
  });
}
