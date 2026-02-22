import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "../bubble/bubbleLookup.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface EmitHumanReplyInput {
  bubbleId: string;
  message: string;
  refs?: string[];
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export interface EmitHumanReplyResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export class HumanReplyCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "HumanReplyCommandError";
  }
}

export async function emitHumanReply(input: EmitHumanReplyInput): Promise<EmitHumanReplyResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const message = requireNonEmptyString(
    input.message,
    "Reply message",
    (inputMessage) => new HumanReplyCommandError(inputMessage)
  );
  const refs = normalizeStringList(input.refs ?? []);

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state !== "WAITING_HUMAN") {
    throw new HumanReplyCommandError(
      `bubble reply can only be used while bubble is WAITING_HUMAN (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw new HumanReplyCommandError(
      `WAITING_HUMAN state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    throw new HumanReplyCommandError(
      "WAITING_HUMAN state is missing active agent context; cannot resume RUNNING after reply."
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
      sender: "human",
      recipient: state.active_agent,
      type: "HUMAN_REPLY",
      round: state.round,
      payload: {
        message
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

  return {
    bubbleId: resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state
  };
}

export function asHumanReplyCommandError(error: unknown): never {
  if (error instanceof HumanReplyCommandError) {
    throw error;
  }

  if (error instanceof BubbleLookupError) {
    throw new HumanReplyCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new HumanReplyCommandError(error.message);
  }

  throw error;
}
