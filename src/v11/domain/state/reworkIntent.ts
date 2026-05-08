import { clearLiveMetaReviewSnapshot } from "../../shared/metaReview/metaReviewSnapshot.js";
import { applyStateTransition } from "./machine.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "./roundContinuation.js";import type {
  AgentName
} from "../agentIdentity/agentIdentity.js";
import type {
  BubbleReworkIntentRecord,
  BubbleStateSnapshot
} from "../../../types/bubble.js";

export interface DeriveQueuedDeferredReworkIntentStateInput {
  state: BubbleStateSnapshot;
  intentId: string;
  message: string;
  refs?: string[];
  requestedBy: string;
  requestedAt: string;
}

export interface QueueDeferredReworkIntentResult {
  state: BubbleStateSnapshot;
  intent: BubbleReworkIntentRecord;
  supersededIntentId?: string;
}

export interface ApplyDeferredReworkIntentInput {
  state: BubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  now: Date;
}

export interface ApplyDeferredReworkIntentResult {
  state: BubbleStateSnapshot;
  intent: BubbleReworkIntentRecord;
}

function readIntentHistory(
  state: BubbleStateSnapshot
): BubbleReworkIntentRecord[] {
  return [...(state.rework_intent_history ?? [])];
}

function ensurePendingIntent(
  state: BubbleStateSnapshot
): BubbleReworkIntentRecord | null {
  const pendingIntent = state.pending_rework_intent ?? null;
  if (pendingIntent === null) {
    return null;
  }

  if (pendingIntent.status !== "pending") {
    throw new Error(
      `REWORK_INTENT_PENDING_STATUS_INVALID: context expected_status=pending actual_status=${pendingIntent.status}; pending_rework_intent must remain pending before apply.`
    );
  }

  return pendingIntent;
}

export function deriveQueuedDeferredReworkIntentState(
  input: DeriveQueuedDeferredReworkIntentStateInput
): QueueDeferredReworkIntentResult {
  const pendingIntent = ensurePendingIntent(input.state);
  const refs = input.refs ?? [];
  const nextIntent: BubbleReworkIntentRecord = {
    intent_id: input.intentId,
    message: input.message,
    ...(refs.length > 0 ? { refs: [...refs] } : {}),
    requested_by: input.requestedBy,
    requested_at: input.requestedAt,
    status: "pending"
  };

  const history = readIntentHistory(input.state);
  if (pendingIntent !== null) {
    history.push({
      ...pendingIntent,
      status: "superseded",
      superseded_by_intent_id: nextIntent.intent_id
    });
  }

  return {
    state: {
      ...input.state,
      pending_rework_intent: nextIntent,
      rework_intent_history: history,
      last_command_at: input.requestedAt
    },
    intent: nextIntent,
    ...(pendingIntent !== null
      ? { supersededIntentId: pendingIntent.intent_id }
      : {})
  };
}

export function applyDeferredReworkIntent(
  input: ApplyDeferredReworkIntentInput
): ApplyDeferredReworkIntentResult | null {
  const pendingIntent = ensurePendingIntent(input.state);
  if (pendingIntent === null) {
    return null;
  }

  const nowIso = input.now.toISOString();
  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: input.state.bubble_id,
    currentRound: input.state.round,
    roundRoleHistory: input.state.round_role_history,
    implementer: input.implementer,
    reviewer: input.reviewer,
    nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
  });

  const resumed = applyStateTransition(input.state, {
    to: "RUNNING",
    round: continuation.nextRound,
    activeAgent: continuation.activeAgent,
    activeRole: continuation.activeRole,
    executionContext: continuation.executionContext,
    activeSince: nowIso,
    lastCommandAt: nowIso,
    ...(continuation.appendRoundRoleEntry !== undefined
      ? { appendRoundRoleEntry: continuation.appendRoundRoleEntry }
      : {})
  });

  const appliedIntent: BubbleReworkIntentRecord = {
    ...pendingIntent,
    status: "applied"
  };

  return {
    state: {
      ...resumed,
      meta_review: clearLiveMetaReviewSnapshot(resumed.meta_review),
      pending_rework_intent: null,
      rework_intent_history: [
        ...(resumed.rework_intent_history ?? []),
        appliedIntent
      ],
      last_command_at: nowIso
    },
    intent: appliedIntent
  };
}
