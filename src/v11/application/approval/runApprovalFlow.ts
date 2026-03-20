import { join } from "node:path";

import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
import {
  buildApprovalDecisionEnvelopePayload,
  emitApprovalDecisionDeliverySignals,
  emitApprovalDecisionLifecycleEvent
} from "./runApprovalDecisionEffects.js";
import {
  mapImmediateReworkResult,
  mapQueuedReworkResult,
  resolveApprovalNextState
} from "./approvalResultMapping.js";
import {
  emitDeferredReworkIntentLifecycleEvents,
  persistDeferredReworkIntentState
} from "./runApprovalDeferredRework.js";
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
  metaReviewFailedHumanState
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

  const written = await persistDeferredReworkIntentState({
    queued,
    loadedFingerprint: loadedState.fingerprint,
    statePath: resolved.bubblePaths.statePath,
    writeStateSnapshot: dependencies.writeStateSnapshot,
    createError: input.createError
  });

  await emitDeferredReworkIntentLifecycleEvents({
    dependencies,
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    round: state.round,
    stateAtRequest: state.state,
    refsCount: input.refs.length,
    message: input.message,
    now: input.now,
    queued
  });

  return mapQueuedReworkResult({
    bubbleId: resolved.bubbleId,
    state: written.state,
    intent: queued.intent,
    supersededIntentId: queued.supersededIntentId
  });
}
