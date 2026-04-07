import { applyStateTransition } from "../../domain/state/machine.js";
import type { BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolEnvelopeDraft } from "../../../types/protocol.js";
import { BubbleWatchdogError } from "./watchdogCommandError.js";

export interface WatchdogAppendProtocolEnvelopeInput {
  transcriptPath: string;
  mirrorPaths?: string[];
  lockPath: string;
  envelope: ProtocolEnvelopeDraft;
  now?: Date;
}

export interface WatchdogAppendProtocolEnvelopeResult {
  envelope: ProtocolEnvelope;
  sequence: number;
}

export interface WatchdogEscalationLoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface WatchdogEscalationMutationInput {
  bubbleId: string;
  bubbleConfig: Pick<BubbleConfig, "watchdog_timeout_minutes">;
  bubblePaths: {
    inboxPath: string;
    locksDir: string;
    statePath: string;
    transcriptPath: string;
  };
  state: BubbleStateSnapshot;
  loadedState: WatchdogEscalationLoadedStateSnapshot;
  now: Date;
  nowIso: string;
  appendProtocolEnvelope: (
    input: WatchdogAppendProtocolEnvelopeInput
  ) => Promise<WatchdogAppendProtocolEnvelopeResult>;
  writeStateSnapshot: (
    statePath: string,
    state: BubbleStateSnapshot,
    options?: {
      expectedFingerprint?: string;
      expectedState?: BubbleStateSnapshot["state"];
    }
  ) => Promise<WatchdogEscalationLoadedStateSnapshot>;
}

export interface WatchdogEscalationMutationResult {
  appended: WatchdogAppendProtocolEnvelopeResult;
  written: WatchdogEscalationLoadedStateSnapshot;
}

function buildEscalationQuestion(
  bubbleId: string,
  activeAgent: string,
  timeoutMinutes: number
): string {
  return `Watchdog timeout: no pairflow command from active agent ${activeAgent} within ${timeoutMinutes} minutes. Please intervene, then run pairflow bubble resume --id ${bubbleId} when ready.`;
}

export async function executeWatchdogEscalationMutation(
  input: WatchdogEscalationMutationInput
): Promise<WatchdogEscalationMutationResult> {
  const lockPath = `${input.bubblePaths.locksDir}/${input.bubbleId}.lock`;
  const appended = await input.appendProtocolEnvelope({
    transcriptPath: input.bubblePaths.transcriptPath,
    mirrorPaths: [input.bubblePaths.inboxPath],
    lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: input.state.round,
      payload: {
        question: buildEscalationQuestion(
          input.bubbleId,
          input.state.active_agent ?? "unknown",
          input.bubbleConfig.watchdog_timeout_minutes
        )
      },
      refs: []
    }
  });

  const nextState = applyStateTransition(input.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.nowIso
  });

  try {
    const written = await input.writeStateSnapshot(
      input.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: input.loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return { appended, written };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleWatchdogError(
      `Watchdog escalation envelope ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }
}
