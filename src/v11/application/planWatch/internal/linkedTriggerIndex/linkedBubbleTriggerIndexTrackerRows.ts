import type {
  LinkedBubbleTriggerDiagnostic
} from "./linkedBubbleTriggerIndexContract.js";
import type { PlanTrackerRow } from "./linkedBubbleTriggerIndexFrontmatter.js";

export function createDuplicateTrackerRowGuard(): (
  row: PlanTrackerRow
) => { duplicate: true; diagnostic?: LinkedBubbleTriggerDiagnostic | undefined } | undefined {
  const seenTaskPathsByTaskId = new Map<string, string | null>();

  return (row: PlanTrackerRow) => {
    const previousTaskPath = seenTaskPathsByTaskId.get(row.taskId);
    if (!seenTaskPathsByTaskId.has(row.taskId)) {
      seenTaskPathsByTaskId.set(row.taskId, row.taskPath);
      return undefined;
    }
    if (previousTaskPath === row.taskPath) {
      return { duplicate: true };
    }
    return {
      duplicate: true,
      diagnostic: {
        kind: "linked_bubble_trigger_diagnostic",
        scope: "plan",
        code: "PLAN_TRACKER_INVALID",
        severity: "warning",
        message: `Plan task_tracker contains duplicate task_id ${row.taskId} with divergent task_path.`
      }
    };
  };
}
