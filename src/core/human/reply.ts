import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  createHumanReplyCommandError,
  HumanReplyCommandError,
  throwAsHumanReplyCommandError
} from "../../v11/shared/reply/replyCommandError.js";
import { normalizeReplyCommandInput } from "../../v11/shared/reply/replyCommandInputNormalization.js";
import { ensureReplyWaitingHumanState } from "../../v11/domain/reply/waitingHumanStateGuard.js";
import type {
  EmitHumanReplyDependencies,
  EmitHumanReplyInput,
  EmitHumanReplyResult
} from "../../v11/application/reply/replyCommandContract.js";
import {
  deliveryTargetRoleMetadataKey
} from "../../types/protocol.js";

export type {
  EmitHumanReplyDependencies,
  EmitHumanReplyInput,
  EmitHumanReplyResult
};
export { HumanReplyCommandError };

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
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: "human",
      recipient: state.active_agent,
      type: "HUMAN_REPLY",
      round: state.round,
      payload: {
        message,
        metadata: {
          [deliveryTargetRoleMetadataKey]: state.active_role
        }
      },
      refs
    }
  });

  const nextState = applyStateTransition(state, {
    to: "RUNNING",
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
    throw new HumanReplyCommandError(
      `HUMAN_REPLY ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
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
