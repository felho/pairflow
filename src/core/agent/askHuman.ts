import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { applyStateTransition } from "../state/machine.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
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

export class AskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanCommandError";
  }
}

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput
): Promise<EmitAskHumanResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const question = requireNonEmptyString(
    input.question,
    "Question",
    (message) => new AskHumanCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);

  const resolved = await resolveBubbleFromWorkspaceCwd(input.cwd);
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

  if (state.state !== "RUNNING") {
    throw new AskHumanCommandError(
      `ask-human can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw new AskHumanCommandError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    throw new AskHumanCommandError(
      "RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION."
    );
  }

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

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitTmuxDeliveryNotification({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    ...(appended.envelope.refs[0] !== undefined
      ? { messageRef: appended.envelope.refs[0] }
      : {})
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitBubbleNotification(resolved.bubbleConfig, "waiting-human");

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
