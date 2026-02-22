import { join } from "node:path";

import { appendProtocolEnvelopes, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { validateConvergencePolicy } from "../convergence/policy.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import type { AgentName, BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
}

export interface EmitConvergedResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export class ConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConvergedCommandError";
  }
}

function assertReviewerContext(
  state: BubbleStateSnapshot,
  configuredReviewer: AgentName
): void {
  if (state.state !== "RUNNING") {
    throw new ConvergedCommandError(
      `converged can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw new ConvergedCommandError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    throw new ConvergedCommandError(
      "RUNNING state is missing active agent context; cannot validate convergence."
    );
  }

  if (state.active_role !== "reviewer") {
    throw new ConvergedCommandError(
      `converged may only be invoked by the active reviewer (active role: ${state.active_role}).`
    );
  }

  if (state.active_agent !== configuredReviewer) {
    throw new ConvergedCommandError(
      `Active reviewer must be configured reviewer agent (${configuredReviewer}).`
    );
  }
}

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput
): Promise<EmitConvergedResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const summary = requireNonEmptyString(
    input.summary,
    "Convergence summary",
    (message) => new ConvergedCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);

  const resolved = await resolveBubbleFromWorkspaceCwd(input.cwd);
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  assertReviewerContext(state, reviewer);

  const transcript = await readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });
  const policy = validateConvergencePolicy({
    currentRound: state.round,
    reviewer,
    implementer,
    roundRoleHistory: state.round_role_history,
    transcript
  });
  if (!policy.ok) {
    throw new ConvergedCommandError(
      `Convergence validation failed: ${policy.errors.join(" ")}`
    );
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  // Keep CONVERGENCE + APPROVAL_REQUEST contiguous in transcript by appending
  // them in one lock-guarded batch write.
  const appended = await appendProtocolEnvelopes({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    entries: [
      {
        envelope: {
          bubble_id: resolved.bubbleId,
          sender: reviewer,
          recipient: "orchestrator",
          type: "CONVERGENCE",
          round: state.round,
          payload: {
            summary
          },
          refs
        }
      },
      {
        envelope: {
          bubble_id: resolved.bubbleId,
          sender: "orchestrator",
          recipient: "human",
          type: "APPROVAL_REQUEST",
          round: state.round,
          payload: {
            summary
          },
          refs
        },
        mirrorPaths: [resolved.bubblePaths.inboxPath]
      }
    ]
  });
  const convergence = appended.entries[0];
  const approvalRequest = appended.entries[1];
  if (convergence === undefined || approvalRequest === undefined) {
    throw new ConvergedCommandError(
      "Converged append batch did not return expected envelopes."
    );
  }

  const nextState = applyStateTransition(state, {
    to: "READY_FOR_APPROVAL",
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
    throw new ConvergedCommandError(
      `CONVERGENCE ${convergence.envelope.id} and APPROVAL_REQUEST ${approvalRequest.envelope.id} were appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  return {
    bubbleId: resolved.bubbleId,
    convergenceSequence: convergence.sequence,
    convergenceEnvelope: convergence.envelope,
    approvalRequestSequence: approvalRequest.sequence,
    approvalRequestEnvelope: approvalRequest.envelope,
    state: written.state
  };
}

export function asConvergedCommandError(error: unknown): never {
  if (error instanceof ConvergedCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new ConvergedCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new ConvergedCommandError(error.message);
  }

  throw error;
}
