import { join } from "node:path";

import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import { isPassIntent, type PassIntent, type ProtocolEnvelope } from "../../types/protocol.js";
import type { AgentName, AgentRole, BubbleStateSnapshot, RoundRoleHistoryEntry } from "../../types/bubble.js";

export interface EmitPassInput {
  summary: string;
  refs?: string[];
  intent?: PassIntent;
  cwd?: string;
  now?: Date;
}

export interface EmitPassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
}

interface ResolvedHandoff {
  senderAgent: AgentName;
  senderRole: AgentRole;
  recipientAgent: AgentName;
  recipientRole: AgentRole;
  envelopeRound: number;
  nextRound: number;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

export class PassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PassCommandError";
  }
}

export function inferPassIntent(activeRole: AgentRole): PassIntent {
  if (activeRole === "implementer") {
    return "review";
  }

  return "fix_request";
}

function requireNonEmptySummary(summary: string): string {
  const normalized = summary.trim();
  if (normalized.length === 0) {
    throw new PassCommandError("PASS summary cannot be empty.");
  }
  return normalized;
}

function normalizeRefs(refs: readonly string[]): string[] {
  const normalized = refs.map((ref) => ref.trim()).filter((ref) => ref.length > 0);
  const unique = [...new Set(normalized)];
  return unique;
}

function resolveHandoff(
  state: BubbleStateSnapshot,
  implementer: AgentName,
  reviewer: AgentName,
  nowIso: string
): ResolvedHandoff {
  if (state.state !== "RUNNING") {
    throw new PassCommandError(
      `PASS can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.active_agent === null || state.active_role === null) {
    throw new PassCommandError(
      "RUNNING state is missing active agent/role; cannot resolve PASS sender."
    );
  }

  if (state.active_role === "implementer" && state.active_agent !== implementer) {
    throw new PassCommandError(
      `Active role implementer must map to configured implementer agent (${implementer}).`
    );
  }
  if (state.active_role === "reviewer" && state.active_agent !== reviewer) {
    throw new PassCommandError(
      `Active role reviewer must map to configured reviewer agent (${reviewer}).`
    );
  }

  if (state.round < 1) {
    throw new PassCommandError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_role === "implementer") {
    return {
      senderAgent: implementer,
      senderRole: "implementer",
      recipientAgent: reviewer,
      recipientRole: "reviewer",
      envelopeRound: state.round,
      nextRound: state.round
    };
  }

  const nextRound = state.round + 1;
  const hasRoundEntry = state.round_role_history.some((entry) => entry.round === nextRound);

  const base: ResolvedHandoff = {
    senderAgent: reviewer,
    senderRole: "reviewer",
    recipientAgent: implementer,
    recipientRole: "implementer",
    envelopeRound: state.round,
    nextRound
  };

  if (hasRoundEntry) {
    return base;
  }

  return {
    ...base,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer,
      reviewer,
      switched_at: nowIso
    }
  };
}

function mapAppendResult(result: AppendProtocolEnvelopeResult): Pick<EmitPassResult, "sequence" | "envelope"> {
  return {
    sequence: result.sequence,
    envelope: result.envelope
  };
}

export async function emitPassFromWorkspace(input: EmitPassInput): Promise<EmitPassResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const summary = requireNonEmptySummary(input.summary);
  const refs = normalizeRefs(input.refs ?? []);

  const resolved = await resolveBubbleFromWorkspaceCwd(input.cwd);

  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  const handoff = resolveHandoff(state, implementer, reviewer, nowIso);

  const inferredIntent = input.intent === undefined;
  const intent = input.intent ?? inferPassIntent(handoff.senderRole);
  if (!isPassIntent(intent)) {
    throw new PassCommandError(`Invalid pass intent: ${String(intent)}`);
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);

  const appendResult = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: handoff.senderAgent,
      recipient: handoff.recipientAgent,
      type: "PASS",
      round: handoff.envelopeRound,
      payload: {
        summary,
        pass_intent: intent
      },
      refs
    }
  });

  const nextState: BubbleStateSnapshot = {
    ...state,
    round: handoff.nextRound,
    active_agent: handoff.recipientAgent,
    active_role: handoff.recipientRole,
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history:
      handoff.appendRoundRoleEntry === undefined
        ? state.round_role_history
        : [...state.round_role_history, handoff.appendRoundRoleEntry]
  };

  let written;
  try {
    // Transcript is canonical source of truth. If state write fails after append,
    // recovery must reconcile from latest transcript entry.
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new PassCommandError(
      `PASS ${appendResult.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  const mapped = mapAppendResult(appendResult);

  return {
    bubbleId: resolved.bubbleId,
    sequence: mapped.sequence,
    envelope: mapped.envelope,
    state: written.state,
    inferredIntent
  };
}

export function asPassCommandError(error: unknown): never {
  if (error instanceof PassCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new PassCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new PassCommandError(error.message);
  }

  throw error;
}
