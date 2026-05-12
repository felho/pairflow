import type { BubbleStateSnapshot } from "./bubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "./persistedBubbleStateSnapshot.js";

export function toPersistedSnapshot(
  snapshot: BubbleStateSnapshot
): PersistedBubbleStateSnapshot {
  const persisted: PersistedBubbleStateSnapshot = {
    bubble_id: snapshot.bubble_id,
    state: snapshot.state,
    round: snapshot.round,
    active_agent: snapshot.active_agent,
    active_role: snapshot.active_role,
    active_since: snapshot.active_since,
    execution_context: snapshot.execution_context,
    round_role_history: snapshot.round_role_history,
    last_command_at: snapshot.last_command_at
  };

  if (snapshot.pending_rework_intent !== undefined) {
    persisted.pending_rework_intent = snapshot.pending_rework_intent;
  }
  if (snapshot.rework_intent_history !== undefined) {
    persisted.rework_intent_history = snapshot.rework_intent_history;
  }
  if (snapshot.meta_review !== undefined) {
    persisted.meta_review = snapshot.meta_review;
  }

  return persisted;
}
