import { randomUUID } from "node:crypto";

import { clearLiveMetaReviewSnapshot } from "../metaReview/metaReviewSnapshot.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { buildRunningExecutionContext } from "../state/executionContext.js";
import type {
  AgentName,
  BubbleReworkIntentRecord,
  BubbleStateSnapshot
} from "../../../types/bubble.js";

export interface QueueDeferredReworkIntentInput {
  state: BubbleStateSnapshot;
  message: string;
  refs?: string[];
  requestedBy: string;
  now: Date;
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

function createIntentId(): string {
  return `intent_${randomUUID()}`;
}

export function queueDeferredReworkIntent(
  input: QueueDeferredReworkIntentInput
): QueueDeferredReworkIntentResult {
  const nowIso = input.now.toISOString();
  const pendingIntent = ensurePendingIntent(input.state);
  const refs = input.refs ?? [];
  const nextIntent: BubbleReworkIntentRecord = {
    intent_id: createIntentId(),
    message: input.message,
    ...(refs.length > 0 ? { refs: [...refs] } : {}),
    requested_by: input.requestedBy,
    requested_at: nowIso,
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
      last_command_at: nowIso
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
  const nextRound = input.state.round + 1;
  const hasRoundEntry = input.state.round_role_history.some(
    (entry) => entry.round === nextRound
  );

  const resumed = applyStateTransition(input.state, {
    to: "RUNNING",
    round: nextRound,
    activeAgent: input.implementer,
    activeRole: "implementer",
    executionContext: buildRunningExecutionContext({
      bubbleId: input.state.bubble_id,
      round: nextRound,
      activeRole: "implementer",
      startedAt: nowIso,
      watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
    }),
    activeSince: nowIso,
    lastCommandAt: nowIso,
    ...(hasRoundEntry
      ? {}
      : {
          appendRoundRoleEntry: {
            round: nextRound,
            implementer: input.implementer,
            reviewer: input.reviewer,
            switched_at: nowIso
          }
        })
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
