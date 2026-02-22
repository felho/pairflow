import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "../bubble/bubbleLookup.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import type { AgentName, BubbleStateSnapshot } from "../../types/bubble.js";
import type { ApprovalDecision, ProtocolEnvelope } from "../../types/protocol.js";

export interface EmitApprovalDecisionInput {
  bubbleId: string;
  decision: ApprovalDecision;
  message?: string | undefined;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface EmitApprovalDecisionResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export interface EmitApproveInput {
  bubbleId: string;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface EmitRequestReworkInput {
  bubbleId: string;
  message: string;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export class ApprovalCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ApprovalCommandError";
  }
}

function resolveNextState(
  state: BubbleStateSnapshot,
  decision: ApprovalDecision,
  nowIso: string,
  implementer: AgentName,
  reviewer: AgentName
): BubbleStateSnapshot {
  if (decision === "approve") {
    return applyStateTransition(state, {
      to: "APPROVED_FOR_COMMIT",
      lastCommandAt: nowIso
    });
  }

  const nextRound = state.round + 1;
  return applyStateTransition(state, {
    to: "RUNNING",
    round: nextRound,
    activeAgent: implementer,
    activeRole: "implementer",
    activeSince: nowIso,
    lastCommandAt: nowIso,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer,
      reviewer,
      switched_at: nowIso
    }
  });
}

export async function emitApprovalDecision(
  input: EmitApprovalDecisionInput
): Promise<EmitApprovalDecisionResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = normalizeStringList(input.refs ?? []);
  const message =
    input.message === undefined
      ? undefined
      : requireNonEmptyString(
          input.message,
          "Decision message",
          (value) => new ApprovalCommandError(value)
        );

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state !== "READY_FOR_APPROVAL") {
    throw new ApprovalCommandError(
      `approval decision can only be used while bubble is READY_FOR_APPROVAL (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw new ApprovalCommandError(
      `READY_FOR_APPROVAL state must have round >= 1 (found ${state.round}).`
    );
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const envelopePayload: ProtocolEnvelope["payload"] = {
    decision: input.decision
  };
  if (message !== undefined) {
    envelopePayload.message = message;
  }

  const appended = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    mirrorPaths: [resolved.bubblePaths.inboxPath],
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: "human",
      recipient: "orchestrator",
      type: "APPROVAL_DECISION",
      round: state.round,
      payload: envelopePayload,
      refs
    }
  });

  const nextState = resolveNextState(
    state,
    input.decision,
    nowIso,
    resolved.bubbleConfig.agents.implementer,
    resolved.bubbleConfig.agents.reviewer
  );

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ApprovalCommandError(
      `APPROVAL_DECISION ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  return {
    bubbleId: resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state
  };
}

export async function emitApprove(
  input: EmitApproveInput
): Promise<EmitApprovalDecisionResult> {
  return emitApprovalDecision({
    bubbleId: input.bubbleId,
    decision: "approve",
    refs: input.refs,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now
  });
}

export async function emitRequestRework(
  input: EmitRequestReworkInput
): Promise<EmitApprovalDecisionResult> {
  return emitApprovalDecision({
    bubbleId: input.bubbleId,
    decision: "revise",
    message: input.message,
    refs: input.refs,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now
  });
}

export function asApprovalCommandError(error: unknown): never {
  if (error instanceof ApprovalCommandError) {
    throw error;
  }

  if (error instanceof BubbleLookupError) {
    throw new ApprovalCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new ApprovalCommandError(error.message);
  }

  throw error;
}
