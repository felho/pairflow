import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { computeWatchdogStatus } from "../runtime/watchdog.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface BubbleWatchdogInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export type BubbleWatchdogNoopReason =
  | "not_monitored"
  | "not_expired"
  | "state_not_running";

export interface BubbleWatchdogResult {
  bubbleId: string;
  escalated: boolean;
  reason: BubbleWatchdogNoopReason | "escalated";
  state: BubbleStateSnapshot;
  envelope?: ProtocolEnvelope | undefined;
  sequence?: number | undefined;
}

export class BubbleWatchdogError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleWatchdogError";
  }
}

function buildEscalationQuestion(
  bubbleId: string,
  activeAgent: string,
  timeoutMinutes: number
): string {
  return `Watchdog timeout: no pairflow command from active agent ${activeAgent} within ${timeoutMinutes} minutes. Please intervene, then run pairflow bubble resume --id ${bubbleId} when ready.`;
}

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput
): Promise<BubbleWatchdogResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  const watchdog = computeWatchdogStatus(
    state,
    resolved.bubbleConfig.watchdog_timeout_minutes,
    now
  );
  if (!watchdog.monitored) {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state
    };
  }

  if (!watchdog.expired) {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "not_expired",
      state
    };
  }

  if (state.state !== "RUNNING") {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "state_not_running",
      state
    };
  }

  if (state.active_agent === null) {
    return {
      bubbleId: resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state
    };
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const appended = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    mirrorPaths: [resolved.bubblePaths.inboxPath],
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: state.round,
      payload: {
        question: buildEscalationQuestion(
          resolved.bubbleId,
          state.active_agent,
          resolved.bubbleConfig.watchdog_timeout_minutes
        )
      },
      refs: []
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
    throw new BubbleWatchdogError(
      `Watchdog escalation envelope ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitTmuxDeliveryNotification({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });
  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitBubbleNotification(resolved.bubbleConfig, "waiting-human");

  return {
    bubbleId: resolved.bubbleId,
    escalated: true,
    reason: "escalated",
    state: written.state,
    envelope: appended.envelope,
    sequence: appended.sequence
  };
}

export function asBubbleWatchdogError(error: unknown): never {
  if (error instanceof BubbleWatchdogError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleWatchdogError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleWatchdogError(error.message);
  }
  throw error;
}
