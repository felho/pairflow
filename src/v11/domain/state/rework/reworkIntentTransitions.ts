import { clearLiveMetaReviewSnapshot } from "../../../shared/metaReview/metaReviewSnapshot.js";
import { applyStateTransition } from "../machine.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../roundContinuation.js";
import type { AgentName } from "../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../snapshot/projection.js";
import type { PersistedBubbleStateSnapshot } from "../snapshot/persistedBubbleStateSnapshot.js";
import type {
  BubbleReworkIntentRecord
} from "./reworkIntentTypes.js";

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
  state: PersistedBubbleStateSnapshot
): BubbleReworkIntentRecord[] {
  return [...(state.rework_intent_history ?? [])];
}

function ensurePendingIntent(
  state: PersistedBubbleStateSnapshot
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
  const persistedState = toPersistedSnapshot(input.state);
  const pendingIntent = ensurePendingIntent(persistedState);
  const refs = input.refs ?? [];
  const nextIntent: BubbleReworkIntentRecord = {
    intent_id: input.intentId,
    message: input.message,
    ...(refs.length > 0 ? { refs: [...refs] } : {}),
    requested_by: input.requestedBy,
    requested_at: input.requestedAt,
    status: "pending"
  };

  const history = readIntentHistory(persistedState);
  if (pendingIntent !== null) {
    history.push({
      ...pendingIntent,
      status: "superseded",
      superseded_by_intent_id: nextIntent.intent_id
    });
  }

  return {
    state: buildBubbleStateSnapshotVariant({
      ...persistedState,
      pending_rework_intent: nextIntent,
      rework_intent_history: history,
      last_command_at: input.requestedAt
    }),
    intent: nextIntent,
    ...(pendingIntent !== null
      ? { supersededIntentId: pendingIntent.intent_id }
      : {})
  };
}

export function applyDeferredReworkIntent(
  input: ApplyDeferredReworkIntentInput
): ApplyDeferredReworkIntentResult | null {
  const persistedState = toPersistedSnapshot(input.state);
  const pendingIntent = ensurePendingIntent(persistedState);
  if (pendingIntent === null) {
    return null;
  }

  const nowIso = input.now.toISOString();
  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: persistedState.bubble_id,
    currentRound: persistedState.round,
    roundRoleHistory: persistedState.round_role_history,
    implementer: input.implementer,
    reviewer: input.reviewer,
    nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
  });

  const resumed = toPersistedSnapshot(
    applyStateTransition(input.state, {
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
    })
  );

  const appliedIntent: BubbleReworkIntentRecord = {
    ...pendingIntent,
    status: "applied"
  };

  return {
    state: buildBubbleStateSnapshotVariant({
      ...resumed,
      meta_review: clearLiveMetaReviewSnapshot(resumed.meta_review),
      pending_rework_intent: null,
      rework_intent_history: [
        ...(resumed.rework_intent_history ?? []),
        appliedIntent
      ],
      last_command_at: nowIso
    }),
    intent: appliedIntent
  };
}
