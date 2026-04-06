import { join } from "node:path";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { ensureReplyWaitingHumanState } from "../../domain/reply/waitingHumanStateGuard.js";
import { buildHumanReplyEnvelopeDraft } from "../../domain/reply/replyEnvelopeDraft.js";
import { raiseReplyPostAppendStateWriteFailed } from "../../domain/reply/postAppendStateWriteFailure.js";
import type {
  EmitHumanReplyDependencies,
  EmitHumanReplyInput,
  EmitHumanReplyResult
} from "../../application/reply/replyCommandContract.js";
import {
  createHumanReplyCommandError,
  throwAsHumanReplyCommandError
} from "./replyCommandError.js";
import { normalizeReplyCommandInput } from "./replyCommandInputNormalization.js";

export async function emitHumanReply(
  input: EmitHumanReplyInput,
  dependencies: EmitHumanReplyDependencies = {}
): Promise<EmitHumanReplyResult> {
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

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
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
  const state = ensureReplyWaitingHumanState({
    state: loadedState.state,
    createError: createHumanReplyCommandError
  });

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);

  const appended = await appendProtocolEnvelope({
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
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "WAITING_HUMAN"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    raiseReplyPostAppendStateWriteFailed({
      envelopeId: appended.envelope.id,
      reason,
      createError: createHumanReplyCommandError
    });
  }

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const messageRef = resolveDeliveryMessageRef({
    bubbleId: resolved.bubbleId,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitDelivery({
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
