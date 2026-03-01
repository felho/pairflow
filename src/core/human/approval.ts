import { join } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "../bubble/bubbleLookup.js";
import { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { queueDeferredReworkIntent } from "./reworkIntent.js";
import type { AgentName, BubbleStateSnapshot } from "../../types/bubble.js";
import type { ApprovalDecision, ProtocolEnvelope } from "../../types/protocol.js";

export interface EmitApprovalDecisionDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
}

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

export interface EmitRequestReworkImmediateResult extends EmitApprovalDecisionResult {
  mode: "immediate";
}

export interface EmitRequestReworkQueuedResult {
  mode: "queued";
  bubbleId: string;
  intentId: string;
  state: BubbleStateSnapshot;
  supersededIntentId?: string;
}

export type EmitRequestReworkResult =
  | EmitRequestReworkImmediateResult
  | EmitRequestReworkQueuedResult;

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
  input: EmitApprovalDecisionInput,
  dependencies: EmitApprovalDecisionDependencies = {}
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

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitDelivery({
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    ...(appended.envelope.refs[0] !== undefined
      ? { messageRef: appended.envelope.refs[0] }
      : {})
  });
  if (input.decision === "revise") {
    const decisionMessageRef =
      appended.envelope.refs[0] ?? `transcript.ndjson#${appended.envelope.id}`;
    // Rework requests must reach the implementer pane explicitly, otherwise
    // a READY_FOR_APPROVAL -> RUNNING transition can remain invisible in practice.
    void emitDelivery({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: {
        ...appended.envelope,
        recipient: resolved.bubbleConfig.agents.implementer
      },
      messageRef: decisionMessageRef
    });
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType:
      input.decision === "approve"
        ? "bubble_approved"
        : "bubble_rework_requested",
    round: state.round,
    actorRole: "human",
    metadata: {
      decision: input.decision,
      refs_count: refs.length,
      has_message: message !== undefined,
      message_length:
        message === undefined ? 0 : Array.from(message).length
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

export async function emitApprove(
  input: EmitApproveInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitApprovalDecisionResult> {
  return emitApprovalDecision({
    bubbleId: input.bubbleId,
    decision: "approve",
    refs: input.refs,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now
  }, dependencies);
}

export async function emitRequestRework(
  input: EmitRequestReworkInput,
  dependencies: EmitApprovalDecisionDependencies = {}
): Promise<EmitRequestReworkResult> {
  const message = requireNonEmptyString(
    input.message,
    "Rework request message",
    (value) => new ApprovalCommandError(value)
  );
  const now = input.now ?? new Date();
  const refs = normalizeStringList(input.refs ?? []);

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state === "READY_FOR_APPROVAL") {
    const immediate = await emitApprovalDecision(
      {
        bubbleId: input.bubbleId,
        decision: "revise",
        message,
        refs,
        repoPath: input.repoPath,
        cwd: input.cwd,
        now
      },
      dependencies
    );
    return {
      ...immediate,
      mode: "immediate"
    };
  }

  if (state.state !== "WAITING_HUMAN") {
    throw new ApprovalCommandError(
      `bubble request-rework can only be used while bubble is READY_FOR_APPROVAL or WAITING_HUMAN (current: ${state.state}).`
    );
  }

  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const queued = queueDeferredReworkIntent({
    state,
    message,
    requestedBy: "human:request-rework",
    now
  });

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, queued.state, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "WAITING_HUMAN"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ApprovalCommandError(
      `Deferred rework intent ${queued.intent.intent_id} was queued in-memory but state update failed. Root error: ${reason}`
    );
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "rework_intent_queued",
    round: state.round,
    actorRole: "human",
    metadata: {
      intent_id: queued.intent.intent_id,
      requested_by: queued.intent.requested_by,
      requested_at: queued.intent.requested_at,
      state_at_request: state.state,
      refs_count: refs.length,
      message_length: Array.from(message).length
    },
    now
  });

  if (queued.supersededIntentId !== undefined) {
    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "rework_intent_superseded",
      round: state.round,
      actorRole: "human",
      metadata: {
        intent_id: queued.supersededIntentId,
        superseded_by_intent_id: queued.intent.intent_id,
        requested_by: queued.intent.requested_by,
        requested_at: queued.intent.requested_at,
        state_at_request: state.state
      },
      now
    });
  }

  return {
    mode: "queued",
    bubbleId: resolved.bubbleId,
    intentId: queued.intent.intent_id,
    ...(queued.supersededIntentId !== undefined
      ? { supersededIntentId: queued.supersededIntentId }
      : {}),
    state: written.state
  };
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
