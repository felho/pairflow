import { randomUUID } from "node:crypto";

import { applyStateTransition } from "../state/machine.js";
import type {
  AgentName,
  BubbleReworkIntentRecord,
  BubbleStateSnapshot
} from "../../types/bubble.js";

export interface QueueDeferredReworkIntentInput {
  state: BubbleStateSnapshot;
  message: string;
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
      `Invalid pending_rework_intent status: expected pending, found ${pendingIntent.status}.`
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
  const nextIntent: BubbleReworkIntentRecord = {
    intent_id: createIntentId(),
    message: input.message,
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
