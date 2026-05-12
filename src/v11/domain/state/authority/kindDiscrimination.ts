import type { PersistedBubbleStateSnapshot } from "../snapshot/persistedBubbleStateSnapshot.js";
import type { BubbleStateSnapshotKind } from "../snapshot/bubbleStateSnapshot.js";

export function discriminateBubbleStateSnapshotKind(
  persisted: PersistedBubbleStateSnapshot
): BubbleStateSnapshotKind {
  switch (persisted.state) {
    case "CREATED":
    case "PREPARING_WORKSPACE":
      return "inactive_initial";
    case "RUNNING":
      if (persisted.round === 0) {
        return "running_ideation";
      }
      if (persisted.active_role === "meta_reviewer") {
        return "running_meta_review";
      }
      return "running_standard";
    case "WAITING_HUMAN":
      return "waiting_human";
    case "READY_FOR_HUMAN_APPROVAL":
      return "ready_for_approval";
    case "APPROVED_FOR_COMMIT":
    case "COMMITTED":
    case "DONE":
      return "terminal_clean";
    case "FAILED":
    case "CANCELLED":
      return "terminal_failed";
  }
}
