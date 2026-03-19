import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { writeStateSnapshot } from "../state/stateStore.js";
import { applyStateTransition } from "../state/machine.js";
import {
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { prepareAskHumanRouting } from "../../v11/application/askHuman/askHumanRoutingPreparation.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface EmitAskHumanInput {
  question: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
}

export interface EmitAskHumanResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
}

export interface EmitAskHumanDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
}

export class AskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanCommandError";
  }
}

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  const now = input.now ?? new Date();
  const {
    nowIso,
    question,
    refs,
    resolved,
    bubbleIdentity,
    loadedState,
    state
  } = await prepareAskHumanRouting({
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now,
    createError: (message) => new AskHumanCommandError(message)
  });

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);

  const appended = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    mirrorPaths: [resolved.bubblePaths.inboxPath],
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: state.active_agent,
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: state.round,
      payload: {
        question
      },
      refs
    }
  });

  const nextState = applyStateTransition(state, {
    to: "WAITING_HUMAN",
    lastCommandAt: nowIso
  });

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AskHumanCommandError(
      `HUMAN_QUESTION ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitNotification =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;
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

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitNotification(resolved.bubbleConfig, "waiting-human");

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_asked_human",
    round: state.round,
    actorRole: state.active_role,
    metadata: {
      sender: state.active_agent,
      refs_count: refs.length,
      question_length: Array.from(question).length
    },
    now
  });

  return {
    bubbleId: resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    inferredRecipient: "human"
  };
}

export function asAskHumanCommandError(error: unknown): never {
  if (error instanceof AskHumanCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new AskHumanCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new AskHumanCommandError(error.message);
  }

  throw error;
}
