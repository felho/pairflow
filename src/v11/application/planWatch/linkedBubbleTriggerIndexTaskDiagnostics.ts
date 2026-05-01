import type {
  LinkedBubbleTriggerDiagnostic
} from "./linkedBubbleTriggerIndexContract.js";
import type { PlanTrackerRow } from "./linkedBubbleTriggerIndexFrontmatter.js";

export function missingTaskPathDiagnostic(row: PlanTrackerRow): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "task",
    code: "TASK_PATH_MISSING",
    severity: "warning",
    message: `Task ${row.taskId} has no usable task_path.`,
    taskId: row.taskId
  };
}

export function outsideRepoTaskPathDiagnostic(
  row: PlanTrackerRow & { taskPath: string }
): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "task",
    code: "TASK_PATH_MISSING",
    severity: "warning",
    message: `Task ${row.taskId} has task_path outside the repository.`,
    taskId: row.taskId,
    taskPath: row.taskPath
  };
}

export function unlinkedTaskDiagnostic(
  row: PlanTrackerRow & { taskPath: string }
): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "task",
    code: "BUBBLE_LINKAGE_MISSING",
    severity: "info",
    message: `Task ${row.taskId} has no linked bubble ids.`,
    taskId: row.taskId,
    taskPath: row.taskPath
  };
}
