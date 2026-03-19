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
  const envelopePayload: ProtocolEnvelope["payload"] = {
    decision: input.decision
  };
  const envelopeMetadata = await resolveApprovalDecisionMetadata({
    decision: input.decision,
    state,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    round: state.round,
    overrideNonApprove: input.overrideNonApprove,
    overrideReason: input.overrideReason,
    readTranscriptEnvelopes: dependencies.readTranscriptEnvelopes,
    createError: input.createError
  });

  if (input.message !== undefined) {
    envelopePayload.message = input.message;
  }
  if (Object.keys(envelopeMetadata).length > 0) {
    envelopePayload.metadata = envelopeMetadata;
  }

  const appended = await dependencies.appendProtocolEnvelope({
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
    written = await dependencies.writeStateSnapshot(
      resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: state.state
      }
    );
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

  // Optional UX signal; never block protocol/state progression on notification failure.
  void dependencies.emitTmuxDeliveryNotification({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef: decisionMessageRef
  });

  if (input.decision === "revise") {
    // Rework requests must reach the implementer pane explicitly, otherwise
    // a human-gate -> RUNNING transition can remain invisible in practice.
    const existingDeliveryMetadata =
      typeof appended.envelope.payload.metadata === "object" &&
      appended.envelope.payload.metadata !== null
        ? appended.envelope.payload.metadata
        : {};
    void dependencies.emitTmuxDeliveryNotification({
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

  await dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType:
      input.decision === "approve"
        ? "bubble_approved"
        : "bubble_rework_requested",
    round: state.round,
    actorRole: "human",
    metadata: {
      decision: input.decision,
      refs_count: input.refs.length,
      has_message: input.message !== undefined,
      message_length:
        input.message === undefined ? 0 : Array.from(input.message).length
    },
    now: input.now
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

  let written;
  try {
    written = await dependencies.writeStateSnapshot(
      resolved.bubblePaths.statePath,
      queued.state,
      {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    );
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
