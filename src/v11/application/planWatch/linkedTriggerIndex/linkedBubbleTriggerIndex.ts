import type {
  LinkedBubbleStatusPortSnapshot,
  LinkedBubbleTriggerCandidate,
  LinkedBubbleTriggerDiagnostic,
  LinkedBubbleTriggerDiagnosticCode,
  LinkedBubbleTriggerDiagnosticSeverity,
  LinkedBubbleTriggerIndexDependencies,
  LinkedBubbleTriggerIndexInput,
  LinkedBubbleTriggerIndexResult,
  LinkedBubbleStatusSnapshot
} from "./linkedBubbleTriggerIndexContract.js";
import {
  extractFrontmatter,
  parseOptionalScalar,
  parseScalarList,
  parseTaskTracker,
  parseTopLevelScalar
} from "./internal/frontmatter.js";
import type { PlanTrackerRow } from "./internal/frontmatter.js";
import { resolveRepoTaskPath } from "./internal/path.js";
import {
  missingTaskPathDiagnostic,
  outsideRepoTaskPathDiagnostic,
  unlinkedTaskDiagnostic
} from "./internal/taskDiagnostics.js";
import { createDuplicateTrackerRowGuard } from "./internal/trackerRows.js";
import {
  isApprovalReadyBubbleState,
  toLinkedBubbleSnapshot,
  toTriggerCandidate,
  type TaskBubbleLink
} from "./internal/bubbleStatusProjection.js";

interface ParsedPlanFrontmatter {
  taskOrder: readonly string[] | undefined;
  taskTracker: readonly PlanTrackerRow[];
}

interface ParsedTaskFrontmatter {
  taskId: string;
  docBubbleId: string | undefined;
  implBubbleId: string | undefined;
}

interface LinkedBubbleTriggerIndexAccumulator {
  diagnostics: LinkedBubbleTriggerDiagnostic[];
  linkedBubbles: LinkedBubbleStatusSnapshot[];
  candidates: LinkedBubbleTriggerCandidate[];
}

type DuplicateTrackerRowGuard = ReturnType<typeof createDuplicateTrackerRowGuard>;

interface LinkedBubbleTriggerIndexCollectionContext {
  input: LinkedBubbleTriggerIndexInput;
  dependencies: LinkedBubbleTriggerIndexDependencies;
  checkDuplicateTrackerRow: DuplicateTrackerRowGuard;
  accumulator: LinkedBubbleTriggerIndexAccumulator;
}

export { isApprovalReadyBubbleState };

export async function resolveLinkedBubbleTriggerIndex(
  input: LinkedBubbleTriggerIndexInput,
  dependencies: LinkedBubbleTriggerIndexDependencies
): Promise<LinkedBubbleTriggerIndexResult> {
  const planContent = await readFileOrDiagnostic(
    dependencies,
    input.planPath,
    planDiagnostic("PLAN_UNREADABLE", "error", "Plan file could not be read.")
  );
  if (typeof planContent !== "string") {
    return emptyResult(input.planPath, [planContent]);
  }

  const parsedPlan = parsePlanFrontmatter(planContent);
  if (!parsedPlan.ok) {
    return emptyResult(input.planPath, [parsedPlan.diagnostic]);
  }

  const checkDuplicateTrackerRow = createDuplicateTrackerRowGuard();
  const accumulator: LinkedBubbleTriggerIndexAccumulator = {
    diagnostics: [],
    linkedBubbles: [],
    candidates: []
  };
  const context: LinkedBubbleTriggerIndexCollectionContext = {
    input,
    dependencies,
    checkDuplicateTrackerRow,
    accumulator
  };

  for (const row of parsedPlan.plan.taskTracker) {
    await collectTrackerRowTriggers(context, row);
  }

  return {
    planPath: input.planPath,
    candidates: accumulator.candidates,
    linkedBubbles: accumulator.linkedBubbles,
    diagnostics: accumulator.diagnostics
  };
}

async function collectTrackerRowTriggers(
  context: LinkedBubbleTriggerIndexCollectionContext,
  row: PlanTrackerRow
): Promise<void> {
  const task = await resolveTaskFrontmatterForTrackerRow(context, row);
  if ("diagnostics" in task) {
    context.accumulator.diagnostics.push(...task.diagnostics);
    return;
  }

  const links = buildTaskBubbleLinks(row, task.taskPath, task.frontmatter);
  if (links.length === 0) {
    context.accumulator.diagnostics.push(
      unlinkedTaskDiagnostic({ ...row, taskPath: task.taskPath })
    );
    return;
  }

  for (const link of links) {
    await collectLinkedBubbleTrigger(context, link);
  }
}

async function resolveTaskFrontmatterForTrackerRow(
  context: LinkedBubbleTriggerIndexCollectionContext,
  row: PlanTrackerRow
): Promise<
  | { frontmatter: ParsedTaskFrontmatter; taskPath: string }
  | { diagnostics: readonly LinkedBubbleTriggerDiagnostic[] }
> {
  const duplicate = context.checkDuplicateTrackerRow(row);
  if (duplicate !== undefined) {
    return {
      diagnostics:
        duplicate.diagnostic !== undefined ? [duplicate.diagnostic] : []
    };
  }

  if (row.taskPath === null) {
    return { diagnostics: [missingTaskPathDiagnostic(row)] };
  }

  const resolvedTaskPath = resolveRepoTaskPath(context.input.repoPath, row.taskPath);
  if (resolvedTaskPath === undefined) {
    return {
      diagnostics: [
        outsideRepoTaskPathDiagnostic({ ...row, taskPath: row.taskPath })
      ]
    };
  }

  const taskContent = await readFileOrDiagnostic(
    context.dependencies,
    resolvedTaskPath,
    taskDiagnostic({
      code: "TASK_UNREADABLE",
      severity: "error",
      message: `Task file for ${row.taskId} could not be read.`,
      taskId: row.taskId,
      taskPath: row.taskPath
    })
  );
  if (typeof taskContent !== "string") {
    return { diagnostics: [taskContent] };
  }

  const parsedTask = parseTaskFrontmatter(taskContent, row);
  if (!parsedTask.ok) {
    return { diagnostics: [parsedTask.diagnostic] };
  }

  return { frontmatter: parsedTask.task, taskPath: row.taskPath };
}

async function collectLinkedBubbleTrigger(
  context: LinkedBubbleTriggerIndexCollectionContext,
  link: TaskBubbleLink
): Promise<void> {
  const status = await readBubbleStatus(
    context.input,
    context.dependencies,
    link
  );
  if ("diagnostic" in status) {
    context.accumulator.diagnostics.push(status.diagnostic);
    return;
  }

  context.accumulator.linkedBubbles.push(
    toLinkedBubbleSnapshot(context.input.planPath, link, status.snapshot)
  );

  if (!status.snapshot.current) {
    context.accumulator.diagnostics.push(
      bubbleDiagnostic({
        code: "BUBBLE_STATUS_STALE",
        severity: "warning",
        message: `Status for bubble ${link.bubbleId} is not current.`,
        link
      })
    );
    return;
  }

  if (isApprovalReadyBubbleState(status.snapshot.state)) {
    context.accumulator.candidates.push(
      toTriggerCandidate(context.input.planPath, link, {
        ...status.snapshot,
        state: status.snapshot.state
      })
    );
  }
}

async function readFileOrDiagnostic(
  dependencies: LinkedBubbleTriggerIndexDependencies,
  path: string,
  diagnostic: LinkedBubbleTriggerDiagnostic
): Promise<string | LinkedBubbleTriggerDiagnostic> {
  try {
    return await dependencies.readFile(path);
  } catch {
    return diagnostic;
  }
}

async function readBubbleStatus(
  input: LinkedBubbleTriggerIndexInput,
  dependencies: LinkedBubbleTriggerIndexDependencies,
  link: TaskBubbleLink
): Promise<
  | { snapshot: LinkedBubbleStatusPortSnapshot }
  | { diagnostic: LinkedBubbleTriggerDiagnostic }
> {
  try {
    const status = await dependencies.getBubbleStatus({
      repoPath: input.repoPath,
      bubbleId: link.bubbleId,
      now: input.now
    });
    if (isDiagnostic(status)) {
      return {
        diagnostic: enrichBubbleDiagnostic(status, link)
      };
    }
    if (typeof status.state !== "string" || status.state.trim().length === 0) {
      return {
        diagnostic: bubbleDiagnostic({
          code: "BUBBLE_STATUS_UNSUPPORTED",
          severity: "error",
          message: `Status for bubble ${link.bubbleId} did not include a usable state.`,
          link
        })
      };
    }
    return {
      snapshot: {
        ...status,
        state: status.state.trim()
      }
    };
  } catch {
    return {
      diagnostic: bubbleDiagnostic({
        code: "BUBBLE_STATUS_UNAVAILABLE",
        severity: "error",
        message: `Status for bubble ${link.bubbleId} could not be read.`,
        link
      })
    };
  }
}

function parsePlanFrontmatter(content: string):
  | { ok: true; plan: ParsedPlanFrontmatter }
  | { ok: false; diagnostic: LinkedBubbleTriggerDiagnostic } {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter === undefined) {
    return {
      ok: false,
      diagnostic: planDiagnostic(
        "PLAN_FRONTMATTER_INVALID",
        "error",
        "Plan frontmatter is missing or malformed."
      )
    };
  }

  const taskOrder = parseScalarList(frontmatter.lines, "task_order");
  const taskTracker = parseTaskTracker(frontmatter.lines);
  if (taskTracker === undefined) {
    return {
      ok: false,
      diagnostic: planDiagnostic(
        "PLAN_TRACKER_INVALID",
        "error",
        "Plan task_tracker is missing or invalid."
      )
    };
  }

  if (
    taskOrder !== undefined
    && taskTracker.some((row) => !taskOrder.includes(row.taskId))
  ) {
    return {
      ok: false,
      diagnostic: planDiagnostic(
        "PLAN_TRACKER_INVALID",
        "error",
        "Plan task_tracker contains a task_id that is not present in task_order."
      )
    };
  }

  return {
    ok: true,
    plan: {
      taskOrder,
      taskTracker
    }
  };
}

function parseTaskFrontmatter(
  content: string,
  row: PlanTrackerRow
):
  | { ok: true; task: ParsedTaskFrontmatter }
  | { ok: false; diagnostic: LinkedBubbleTriggerDiagnostic } {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter === undefined) {
    return {
      ok: false,
      diagnostic: taskDiagnostic({
        code: "TASK_FRONTMATTER_INVALID",
        severity: "error",
        message: `Task ${row.taskId} frontmatter is missing or malformed.`,
        taskId: row.taskId,
        taskPath: row.taskPath ?? undefined
      })
    };
  }

  const taskId = parseTopLevelScalar(frontmatter.lines, "task_id");
  if (taskId === undefined) {
    return {
      ok: false,
      diagnostic: taskDiagnostic({
        code: "TASK_FRONTMATTER_INVALID",
        severity: "error",
        message: `Task ${row.taskId} frontmatter is missing task_id.`,
        taskId: row.taskId,
        taskPath: row.taskPath ?? undefined
      })
    };
  }
  if (taskId !== row.taskId) {
    return {
      ok: false,
      diagnostic: taskDiagnostic({
        code: "TASK_ID_MISMATCH",
        severity: "error",
        message: `Task frontmatter task_id ${taskId} does not match tracker task_id ${row.taskId}.`,
        taskId: row.taskId,
        taskPath: row.taskPath ?? undefined
      })
    };
  }

  return {
    ok: true,
    task: {
      taskId,
      docBubbleId: parseOptionalScalar(frontmatter.lines, "doc_bubble_id"),
      implBubbleId: parseOptionalScalar(frontmatter.lines, "impl_bubble_id")
    }
  };
}

function buildTaskBubbleLinks(
  row: PlanTrackerRow,
  taskPath: string,
  task: ParsedTaskFrontmatter
): TaskBubbleLink[] {
  const links: TaskBubbleLink[] = [];
  if (task.docBubbleId !== undefined) {
    links.push({
      taskId: task.taskId,
      taskPath,
      bubbleId: task.docBubbleId,
      bubbleRole: "document"
    });
  }
  if (task.implBubbleId !== undefined) {
    links.push({
      taskId: task.taskId,
      taskPath,
      bubbleId: task.implBubbleId,
      bubbleRole: "implementation"
    });
  }
  return links;
}

function emptyResult(
  planPath: string,
  diagnostics: readonly LinkedBubbleTriggerDiagnostic[]
): LinkedBubbleTriggerIndexResult {
  return {
    planPath,
    candidates: [],
    linkedBubbles: [],
    diagnostics
  };
}

function isDiagnostic(value: unknown): value is LinkedBubbleTriggerDiagnostic {
  return (
    typeof value === "object"
    && value !== null
    && "kind" in value
    && value.kind === "linked_bubble_trigger_diagnostic"
  );
}

function enrichBubbleDiagnostic(
  diagnostic: LinkedBubbleTriggerDiagnostic,
  link: TaskBubbleLink
): LinkedBubbleTriggerDiagnostic {
  return {
    ...diagnostic,
    scope: "bubble",
    taskId: link.taskId,
    taskPath: link.taskPath,
    bubbleId: link.bubbleId,
    bubbleRole: link.bubbleRole
  };
}

function planDiagnostic(
  code: LinkedBubbleTriggerDiagnosticCode,
  severity: LinkedBubbleTriggerDiagnosticSeverity,
  message: string
): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "plan",
    code,
    severity,
    message
  };
}

function taskDiagnostic(input: {
  code: LinkedBubbleTriggerDiagnosticCode;
  severity: LinkedBubbleTriggerDiagnosticSeverity;
  message: string;
  taskId?: string | undefined;
  taskPath?: string | undefined;
}): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "task",
    code: input.code,
    severity: input.severity,
    message: input.message,
    ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
    ...(input.taskPath !== undefined ? { taskPath: input.taskPath } : {})
  };
}

function bubbleDiagnostic(input: {
  code: LinkedBubbleTriggerDiagnosticCode;
  severity: LinkedBubbleTriggerDiagnosticSeverity;
  message: string;
  link: TaskBubbleLink;
}): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "bubble",
    code: input.code,
    severity: input.severity,
    message: input.message,
    taskId: input.link.taskId,
    taskPath: input.link.taskPath,
    bubbleId: input.link.bubbleId,
    bubbleRole: input.link.bubbleRole
  };
}
