import { join } from "node:path";

import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { ensureReplyWaitingHumanState } from "../../domain/reply/waitingHumanStateGuard.js";
import { buildHumanReplyEnvelopeDraft } from "../../domain/reply/replyEnvelopeDraft.js";
import { raiseReplyPostAppendStateWriteFailed } from "../../domain/reply/postAppendStateWriteFailure.js";
import type {
  EmitHumanReplyDependencies,
  EmitHumanReplyInput,
  EmitHumanReplyResult
} from "./replyCommandContract.js";
import {
  createHumanReplyCommandError,
  throwAsHumanReplyCommandError
} from "../../shared/reply/replyCommandError.js";
import { resolveReplyCommandDependencies } from "../../shared/reply/replyCommandDependencyResolution.js";
import { normalizeReplyCommandInput } from "../../shared/reply/replyCommandInputNormalization.js";

export async function emitHumanReply(
  input: EmitHumanReplyInput,
  dependencies: EmitHumanReplyDependencies = {}
): Promise<EmitHumanReplyResult> {
  const resolvedDependencies = resolveReplyCommandDependencies(dependencies);
  const normalizedInput = normalizeReplyCommandInput({
    message: input.message,
    refs: input.refs,
    now: input.now,
    createError: createHumanReplyCommandError
  });
  const now = normalizedInput.now;
  const nowIso = normalizedInput.nowIso;
  const message = normalizedInput.message;
  const refs = normalizedInput.refs;

  const resolved = await resolvedDependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const bubbleIdentity = await resolvedDependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await resolvedDependencies.readStateSnapshot(
    resolved.bubblePaths.statePath
  );
  const state = ensureReplyWaitingHumanState({
    state: loadedState.state,
    createError: createHumanReplyCommandError
  });

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);

  const appended = await resolvedDependencies.appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    mirrorPaths: [resolved.bubblePaths.inboxPath],
    lockPath,
    now,
    envelope: buildHumanReplyEnvelopeDraft({
      bubbleId: resolved.bubbleId,
      recipient: state.active_agent,
      recipientRole: state.active_role,
      round: state.round,
      message,
      refs
    })
  });

  const nextState = applyStateTransition(state, {
    to: "RUNNING",
    executionContext: buildRunningExecutionContext({
      bubbleId: resolved.bubbleId,
      round: state.round,
      activeRole: state.active_role,
      startedAt: nowIso,
      watchdogTimeoutMinutes: resolved.bubbleConfig.watchdog_timeout_minutes
    }),
    activeSince: nowIso,
    lastCommandAt: nowIso
  });

  let written;
  try {
    written = await resolvedDependencies.writeStateSnapshot(
      resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    raiseReplyPostAppendStateWriteFailed({
      envelopeId: appended.envelope.id,
      reason,
      createError: createHumanReplyCommandError
    });
  }

  const messageRef = resolvedDependencies.resolveDeliveryMessageRef({
    bubbleId: resolved.bubbleId,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void resolvedDependencies.emitTmuxDeliveryNotification({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef
  });

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_replied",
    round: state.round,
    actorRole: "human",
    metadata: {
      recipient: state.active_agent,
      refs_count: refs.length,
      message_length: Array.from(message).length
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

export function asHumanReplyCommandError(error: unknown): never {
  return throwAsHumanReplyCommandError(error);
}
