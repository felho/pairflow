import { describe, expect, it, vi } from "vitest";

import {
  isApprovalReadyBubbleState,
  resolveLinkedBubbleTriggerIndex
} from "../../../../src/v11/application/planWatch/linkedBubbleTriggerIndex.js";
import type {
  LinkedBubbleStatusPort,
  LinkedBubbleTriggerCandidate,
  LinkedBubbleTriggerDiagnostic,
  LinkedBubbleTriggerIndexDependencies,
  LinkedBubbleTriggerIndexResult
} from "../../../../src/v11/application/planWatch/linkedBubbleTriggerIndexContract.js";
import {
  linkedBubbleTriggerIndexDefaults
} from "../../../../src/v11/defaults/planWatch/linkedBubbleTriggerIndexDefaults.js";

const repoPath = "/repo";
const planPath = "/repo/plans/local-plan-watch-plan-v1.md";
const forbiddenWorkflowSurfaceKeys = [
  "route_class",
  "target_workflow_surface",
  "approval_gate_state",
  "continuation_mode"
];

function planFrontmatter(rows: string): string {
  return `---
task_order:
  - task-a
  - task-b
task_tracker:
${rows}
---

# Plan
`;
}

function trackerRow(input: {
  taskId: string;
  taskPath: string | null;
  status?: string | undefined;
}): string {
  const taskPathLine =
    input.taskPath === null ? "    task_path: null" : `    task_path: ${input.taskPath}`;
  return `  - task_id: ${input.taskId}
${taskPathLine}
    status: ${input.status ?? "implementable"}`;
}

function taskFrontmatter(input: {
  taskId: string;
  docBubbleId?: string | undefined;
  implBubbleId?: string | undefined;
}): string {
  return `---
task_id: ${input.taskId}
${input.docBubbleId === undefined ? "" : `doc_bubble_id: ${input.docBubbleId}\n`}${input.implBubbleId === undefined ? "" : `impl_bubble_id: ${input.implBubbleId}\n`}---

# Task
`;
}

function deps(input: {
  plan?: string | Error | undefined;
  tasks?: Readonly<Record<string, string | Error>> | undefined;
  status?: LinkedBubbleStatusPort | undefined;
}): LinkedBubbleTriggerIndexDependencies {
  const tasks = input.tasks ?? {};
  return {
    readFile: vi.fn(async (path: string) => {
      if (path === planPath) {
        if (input.plan instanceof Error) {
          throw input.plan;
        }
        return input.plan ?? planFrontmatter(trackerRow({
          taskId: "task-a",
          taskPath: "plans/tasks/task-a.md"
        }));
      }
      const relative = path.startsWith(`${repoPath}/`)
        ? path.slice(repoPath.length + 1)
        : path;
      const task = tasks[relative];
      if (task instanceof Error || task === undefined) {
        throw task ?? new Error("missing task");
      }
      return task;
    }),
    getBubbleStatus:
      input.status
      ?? vi.fn(async () => ({
        state: "RUNNING",
        current: true
      }))
  };
}

async function resolve(
  dependencies: LinkedBubbleTriggerIndexDependencies
): Promise<LinkedBubbleTriggerIndexResult> {
  return resolveLinkedBubbleTriggerIndex(
    {
      repoPath,
      planPath,
      now: new Date("2026-05-01T10:00:00.000Z")
    },
    dependencies
  );
}

function expectNoForbiddenWorkflowSurfaceKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((item) => expectNoForbiddenWorkflowSurfaceKeys(item));
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }

  const record = value as Readonly<Record<string, unknown>>;
  for (const key of forbiddenWorkflowSurfaceKeys) {
    expect(record).not.toHaveProperty(key);
  }
  Object.values(record).forEach((item) => expectNoForbiddenWorkflowSurfaceKeys(item));
}

describe("linkedBubbleTriggerIndex", () => {
  it("emits one document trigger candidate for a canonical approval-ready linked bubble", async () => {
    const getBubbleStatus = vi.fn(async () => ({
      state: "READY_FOR_HUMAN_APPROVAL",
      observedAt: "2026-05-01T09:59:00.000Z",
      current: true,
      statusRef: "status:doc-bubble",
      metadata: { source: "local-status" }
    }));
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: getBubbleStatus
      })
    );

    expect(getBubbleStatus).toHaveBeenCalledWith({
      repoPath,
      bubbleId: "doc-bubble",
      now: new Date("2026-05-01T10:00:00.000Z")
    });
    expect(result.candidates).toEqual([
      {
        planPath,
        taskId: "task-a",
        taskPath: "plans/tasks/task-a.md",
        bubbleId: "doc-bubble",
        bubbleRole: "document",
        observedState: "READY_FOR_HUMAN_APPROVAL",
        observedAt: "2026-05-01T09:59:00.000Z",
        statusRef: "status:doc-bubble",
        statusMetadata: { source: "local-status" }
      }
    ]);
    expect(result.linkedBubbles).toHaveLength(1);
    expectNoForbiddenWorkflowSurfaceKeys(result);
  });

  it("preserves legacy approval-ready state for an implementation bubble", async () => {
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            implBubbleId: "impl-bubble"
          })
        },
        status: vi.fn(async () => ({
          state: "READY_FOR_APPROVAL",
          current: true
        }))
      })
    );

    expect(result.candidates).toMatchObject([
      {
        bubbleId: "impl-bubble",
        bubbleRole: "implementation",
        observedState: "READY_FOR_APPROVAL"
      }
    ]);
  });

  it.each([
    "CREATED",
    "RUNNING",
    "WAITING_HUMAN",
    "META_REVIEW_RUNNING",
    "APPROVED_FOR_COMMIT",
    "DONE",
    "CANCELLED"
  ])("does not emit candidates for non-trigger state %s", async (state) => {
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            implBubbleId: "impl-bubble"
          })
        },
        status: vi.fn(async () => ({
          state,
          current: true
        }))
      })
    );

    expect(result.candidates).toEqual([]);
    expect(result.linkedBubbles).toMatchObject([{ state }]);
  });

  it("skips missing task paths and unlinked tasks without synthesizing bubble ids", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: planFrontmatter(
          `${trackerRow({ taskId: "task-a", taskPath: null })}
${trackerRow({ taskId: "task-b", taskPath: "plans/tasks/task-b.md" })}`
        ),
        tasks: {
          "plans/tasks/task-b.md": taskFrontmatter({ taskId: "task-b" })
        },
        status: getBubbleStatus
      })
    );

    expect(result.candidates).toEqual([]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "TASK_PATH_MISSING",
      "BUBBLE_LINKAGE_MISSING"
    ]);
  });

  it("keeps a tracker row with absent task_path as a per-task missing-path diagnostic", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
task_tracker:
  - task_id: task-a
    status: implementable
---
`,
        status: getBubbleStatus
      })
    );

    expect(result.diagnostics).toMatchObject([
      { scope: "task", code: "TASK_PATH_MISSING", taskId: "task-a" }
    ]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("treats lone-quote tracker scalars as missing or invalid instead of empty ids and paths", async () => {
    const missingPathStatus = vi.fn();
    const missingPath = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
task_tracker:
  - task_id: task-a
    task_path: '
---
`,
        status: missingPathStatus
      })
    );
    const invalidTaskIdStatus = vi.fn();
    const invalidTaskId = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
task_tracker:
  - task_id: '
    task_path: plans/tasks/task-a.md
---
`,
        status: invalidTaskIdStatus
      })
    );

    expect(missingPath.diagnostics).toMatchObject([
      { scope: "task", code: "TASK_PATH_MISSING", taskId: "task-a" }
    ]);
    expect(invalidTaskId.diagnostics).toMatchObject([
      { scope: "plan", code: "PLAN_TRACKER_INVALID" }
    ]);
    expect(missingPathStatus).not.toHaveBeenCalled();
    expect(invalidTaskIdStatus).not.toHaveBeenCalled();
  });

  it("emits a plan unreadable diagnostic and does not call status when the plan cannot be read", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: new Error("missing"),
        status: getBubbleStatus
      })
    );

    expect(result).toMatchObject({
      candidates: [],
      linkedBubbles: [],
      diagnostics: [{ scope: "plan", code: "PLAN_UNREADABLE" }]
    });
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("emits a plan frontmatter diagnostic and does not call status for malformed plans", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: "---\ntask_tracker:\n  - task_id: task-a\n# no closing fence\n",
        status: getBubbleStatus
      })
    );

    expect(result.diagnostics).toMatchObject([
      { scope: "plan", code: "PLAN_FRONTMATTER_INVALID" }
    ]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("emits a plan tracker diagnostic for contradictory task order", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-b
task_tracker:
  - task_id: task-a
    task_path: plans/tasks/task-a.md
---
`,
        status: getBubbleStatus
      })
    );

    expect(result.diagnostics).toMatchObject([
      { scope: "plan", code: "PLAN_TRACKER_INVALID" }
    ]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("emits a plan tracker diagnostic when task_tracker is absent", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
---
`,
        status: getBubbleStatus
      })
    );

    expect(result.diagnostics).toMatchObject([
      { scope: "plan", code: "PLAN_TRACKER_INVALID" }
    ]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("emits a plan tracker diagnostic when an empty task_order contradicts tracker rows", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: `---
task_order:
  # no active task ids

task_tracker:
  - task_id: task-a
    task_path: plans/tasks/task-a.md
---
`,
        status: getBubbleStatus
      })
    );

    expect(result.diagnostics).toMatchObject([
      { scope: "plan", code: "PLAN_TRACKER_INVALID" }
    ]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("keeps task_order valid when blank lines appear between items", async () => {
    const getBubbleStatus = vi.fn(async () => ({
      state: "READY_FOR_HUMAN_APPROVAL",
      current: true
    }));
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-a

  - task-b
task_tracker:
  - task_id: task-a
    task_path: plans/tasks/task-a.md
---
`,
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: getBubbleStatus
      })
    );

    expect(result.candidates).toMatchObject([{ bubbleId: "doc-bubble" }]);
    expect(result.diagnostics).toEqual([]);
  });

  it("treats an empty-but-present task_tracker as empty trigger evidence", async () => {
    const getBubbleStatus = vi.fn();
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
task_tracker:
---
`,
        status: getBubbleStatus
      })
    );

    expect(result).toEqual({
      planPath,
      candidates: [],
      linkedBubbles: [],
      diagnostics: []
    });
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("deduplicates duplicate tracker task ids before task and status reads", async () => {
    const getBubbleStatus = vi.fn(async () => ({
      state: "READY_FOR_HUMAN_APPROVAL",
      current: true
    }));
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
task_tracker:
  - task_id: task-a
    task_path: plans/tasks/task-a.md
  - task_id: task-a
    task_path: plans/tasks/task-a.md
---
`,
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: getBubbleStatus
      })
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.linkedBubbles).toHaveLength(1);
    expect(getBubbleStatus).toHaveBeenCalledTimes(1);
  });

  it("diagnoses duplicate tracker task ids with divergent task paths", async () => {
    const getBubbleStatus = vi.fn(async () => ({
      state: "READY_FOR_HUMAN_APPROVAL",
      current: true
    }));
    const result = await resolve(
      deps({
        plan: `---
task_order:
  - task-a
task_tracker:
  - task_id: task-a
    task_path: plans/tasks/task-a.md
  - task_id: task-a
    task_path: plans/tasks/task-a-copy.md
---
`,
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: getBubbleStatus
      })
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.diagnostics).toMatchObject([
      { scope: "plan", code: "PLAN_TRACKER_INVALID", severity: "warning" }
    ]);
    expect(getBubbleStatus).toHaveBeenCalledTimes(1);
  });

  it("blocks tracker task paths that traverse outside the repository", async () => {
    const getBubbleStatus = vi.fn();
    const dependencies = deps({
      plan: `---
task_order:
  - task-a
task_tracker:
  - task_id: task-a
    task_path: ../outside.md
---
`,
      status: getBubbleStatus
    });
    const result = await resolve(dependencies);

    expect(result.diagnostics).toMatchObject([
      {
        scope: "task",
        code: "TASK_PATH_MISSING",
        taskId: "task-a",
        taskPath: "../outside.md"
      }
    ]);
    expect(dependencies.readFile).toHaveBeenCalledTimes(1);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("continues to later tracker rows when one task file is unreadable", async () => {
    const getBubbleStatus = vi.fn(async () => ({
      state: "READY_FOR_HUMAN_APPROVAL",
      current: true
    }));
    const result = await resolve(
      deps({
        plan: planFrontmatter(
          `${trackerRow({ taskId: "task-a", taskPath: "plans/tasks/task-a.md" })}
${trackerRow({ taskId: "task-b", taskPath: "plans/tasks/task-b.md" })}`
        ),
        tasks: {
          "plans/tasks/task-b.md": taskFrontmatter({
            taskId: "task-b",
            docBubbleId: "doc-bubble"
          })
        },
        status: getBubbleStatus
      })
    );

    expect(result.diagnostics).toMatchObject([
      { scope: "task", code: "TASK_UNREADABLE", taskId: "task-a" }
    ]);
    expect(result.candidates).toHaveLength(1);
  });

  it("emits task frontmatter and task id mismatch diagnostics without status calls", async () => {
    const getBubbleStatus = vi.fn();
    const malformed = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": "# Missing frontmatter"
        },
        status: getBubbleStatus
      })
    );
    const mismatch = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-b",
            docBubbleId: "doc-bubble"
          })
        },
        status: getBubbleStatus
      })
    );

    expect(malformed.diagnostics).toMatchObject([
      { scope: "task", code: "TASK_FRONTMATTER_INVALID" }
    ]);
    expect(mismatch.diagnostics).toMatchObject([
      { scope: "task", code: "TASK_ID_MISMATCH" }
    ]);
    expect(getBubbleStatus).not.toHaveBeenCalled();
  });

  it("emits a bubble diagnostic when the status port fails", async () => {
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: vi.fn(async () => {
          throw new Error("status failed");
        })
      })
    );

    expect(result.candidates).toEqual([]);
    expect(result.diagnostics).toMatchObject([
      {
        scope: "bubble",
        code: "BUBBLE_STATUS_UNAVAILABLE",
        taskId: "task-a",
        taskPath: "plans/tasks/task-a.md",
        bubbleId: "doc-bubble",
        bubbleRole: "document"
      }
    ]);
  });

  it("fails closed on stale remote status even if the state is approval-ready", async () => {
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "remote-doc-bubble"
          })
        },
        status: vi.fn(async () => ({
          state: "READY_FOR_HUMAN_APPROVAL",
          observedAt: "2026-05-01T09:00:00.000Z",
          current: false,
          statusRef: "remote-cache"
        }))
      })
    );

    expect(result.candidates).toEqual([]);
    expect(result.linkedBubbles).toMatchObject([
      {
        bubbleId: "remote-doc-bubble",
        state: "READY_FOR_HUMAN_APPROVAL",
        current: false,
        statusRef: "remote-cache"
      }
    ]);
    expect(result.diagnostics).toMatchObject([
      { scope: "bubble", code: "BUBBLE_STATUS_STALE" }
    ]);
  });

  it("enriches diagnostics returned by the status port", async () => {
    const portDiagnostic: LinkedBubbleTriggerDiagnostic = {
      kind: "linked_bubble_trigger_diagnostic",
      scope: "bubble",
      code: "BUBBLE_STATUS_UNAVAILABLE",
      severity: "error",
      message: "remote unavailable"
    };
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            implBubbleId: "impl-bubble"
          })
        },
        status: vi.fn(async () => portDiagnostic)
      })
    );

    expect(result.diagnostics).toEqual([
      {
        ...portDiagnostic,
        taskId: "task-a",
        taskPath: "plans/tasks/task-a.md",
        bubbleId: "impl-bubble",
        bubbleRole: "implementation"
      }
    ]);
  });

  it("uses resolver task and bubble context over conflicting status-port diagnostics", async () => {
    const portDiagnostic: LinkedBubbleTriggerDiagnostic = {
      kind: "linked_bubble_trigger_diagnostic",
      scope: "bubble",
      code: "BUBBLE_STATUS_UNAVAILABLE",
      severity: "error",
      message: "remote unavailable",
      taskId: "wrong-task",
      taskPath: "wrong/path.md",
      bubbleId: "wrong-bubble",
      bubbleRole: "document"
    };
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            implBubbleId: "impl-bubble"
          })
        },
        status: vi.fn(async () => portDiagnostic)
      })
    );

    expect(result.diagnostics).toEqual([
      {
        ...portDiagnostic,
        taskId: "task-a",
        taskPath: "plans/tasks/task-a.md",
        bubbleId: "impl-bubble",
        bubbleRole: "implementation"
      }
    ]);
  });

  it("does not classify status snapshots as diagnostics by duck-typed diagnostic fields", async () => {
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: vi.fn(async () => ({
          state: "READY_FOR_HUMAN_APPROVAL",
          current: true,
          scope: "bubble",
          code: "BUBBLE_STATUS_UNAVAILABLE",
          severity: "error"
        }))
      })
    );

    expect(result.candidates).toMatchObject([{ bubbleId: "doc-bubble" }]);
    expect(result.diagnostics).toEqual([]);
  });

  it.each(["", "   \n\t"])(
    "emits unsupported status diagnostics for payload state %j",
    async (state) => {
    const result = await resolve(
      deps({
        tasks: {
          "plans/tasks/task-a.md": taskFrontmatter({
            taskId: "task-a",
            docBubbleId: "doc-bubble"
          })
        },
        status: vi.fn(async () => ({
          state,
          current: true
        }))
      })
    );

    expect(result.candidates).toEqual([]);
    expect(result.diagnostics).toMatchObject([
      { scope: "bubble", code: "BUBBLE_STATUS_UNSUPPORTED" }
    ]);
    }
  );

  it.each([null, 123])(
    "emits unsupported status diagnostics for non-string payload state %j",
    async (state) => {
      const result = await resolve(
        deps({
          tasks: {
            "plans/tasks/task-a.md": taskFrontmatter({
              taskId: "task-a",
              docBubbleId: "doc-bubble"
            })
          },
          status: vi.fn(async () => ({
            state: state as unknown as string,
            current: true
          }))
        })
      );

      expect(result.candidates).toEqual([]);
      expect(result.diagnostics).toMatchObject([
        { scope: "bubble", code: "BUBBLE_STATUS_UNSUPPORTED" }
      ]);
    }
  );

  it("provides a default dependency object that fails closed without a status port", async () => {
    const diagnostic = await linkedBubbleTriggerIndexDefaults.getBubbleStatus({
      repoPath,
      bubbleId: "doc-bubble"
    });

    expect(diagnostic).toMatchObject({
      kind: "linked_bubble_trigger_diagnostic",
      scope: "bubble",
      code: "BUBBLE_STATUS_UNAVAILABLE"
    });
  });

  it("runs with injected read and exact-id status ports only", async () => {
    const readFile = vi.fn(async (path: string) => {
      if (path === planPath) {
        return planFrontmatter(
          trackerRow({ taskId: "task-a", taskPath: "/repo/custom/task-a.md" })
        );
      }
      if (path === "/repo/custom/task-a.md") {
        return taskFrontmatter({
          taskId: "task-a",
          docBubbleId: "doc-bubble"
        });
      }
      throw new Error("unexpected path");
    });
    const getBubbleStatus = vi.fn(async () => ({
      state: "READY_FOR_HUMAN_APPROVAL",
      current: true
    }));

    await resolveLinkedBubbleTriggerIndex({ repoPath, planPath }, {
      readFile,
      getBubbleStatus
    });

    expect(readFile).toHaveBeenCalledTimes(2);
    expect(getBubbleStatus).toHaveBeenCalledTimes(1);
    expect(getBubbleStatus).toHaveBeenCalledWith({
      repoPath,
      bubbleId: "doc-bubble",
      now: undefined
    });
  });

  it("exports the public result and candidate types through the package index", () => {
    const candidate: LinkedBubbleTriggerCandidate = {
      planPath,
      taskId: "task-a",
      taskPath: "plans/tasks/task-a.md",
      bubbleId: "doc-bubble",
      bubbleRole: "document",
      observedState: "READY_FOR_HUMAN_APPROVAL"
    };
    const result: LinkedBubbleTriggerIndexResult = {
      planPath,
      candidates: [candidate],
      linkedBubbles: [],
      diagnostics: []
    };

    expect(result.candidates[0]).toBe(candidate);
    expect(isApprovalReadyBubbleState("READY_FOR_HUMAN_APPROVAL")).toBe(true);
    expect(isApprovalReadyBubbleState("RUNNING")).toBe(false);
  });
});
