import {
  appendFile,
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAgentRunnerContinuationPayload,
  runExecutePairflowPlanContinuation
} from "../../../../src/v11/application/planWatch/runner/agentRunnerBridge.js";
import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerBridgeInput,
  AgentRunnerContinuationPayload,
  AgentRunnerProcessInvocation,
  AgentRunnerProcessResult
} from "../../../../src/v11/application/planWatch/runner/agentRunnerBridgeContract.js";
import {
  buildArtifactDirBaseName,
  planSlugFromPath
} from "../../../../src/v11/application/planWatch/runner/codexAgentRunnerArtifacts.js";
import {
  prepareCodexRunnerFiles,
  validateContinuationPayload
} from "../../../../src/v11/application/planWatch/runner/codexAgentRunnerBridge.js";
import { parseCodexJsonlStream } from "../../../../src/v11/application/planWatch/runner/codexAgentRunnerStream.js";
import { normalizeCodexTimeline } from "../../../../src/v11/application/planWatch/runner/codexAgentRunnerTimeline.js";
import { runAgentRunnerCommand } from "../../../../src/v11/defaults/planWatch/agentRunnerBridgeDefaults.js";
import { MAX_NODE_TIMER_DELAY_MS } from "../../../../src/v11/shared/timing/nodeTimerDelay.js";
import type {
  ProcessSpawnPipeChild,
  ProcessSpawnPort
} from "../../../../src/v11/ports/processSpawn.js";

const tempDirs: string[] = [];
const tempPaths: string[] = [];
let artifactCounter = 0;

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-agent-runner-bridge-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all([
    ...tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    ),
    ...tempPaths.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  ]);
});

function baseInput(): AgentRunnerBridgeInput {
  return {
    planPath: "/repo/plans/local-plan-watch-plan-v1.md",
    repoPath: "/repo",
    invocationId: "invocation-001",
    now: new Date("2026-05-01T10:00:00.000Z"),
    trigger: {
      source: "test",
      reason: "bubble_passed",
      observedAt: "2026-05-01T09:59:00.000Z",
      refs: ["bubble:demo"]
    }
  };
}

function deps(
  overrides: Partial<AgentRunnerBridgeDependencies> = {}
): AgentRunnerBridgeDependencies {
  artifactCounter += 1;
  const artifactSuffix = `${process.pid}-${artifactCounter}`;
  const defaultArtifactDir = join(tmpdir(), `pairflow-agent-runner-artifacts-${artifactSuffix}`);
  const defaultSchemaFilePath = join(tmpdir(), `pairflow-agent-runner-schema-${artifactSuffix}.json`);
  const defaultMetadataFilePath = join(tmpdir(), `pairflow-agent-runner-metadata-${artifactSuffix}.json`);
  const defaultEventsFilePath = join(tmpdir(), `pairflow-agent-runner-events-${artifactSuffix}.ndjson`);
  const defaultTimelineFilePath = join(tmpdir(), `pairflow-agent-runner-timeline-${artifactSuffix}.ndjson`);
  tempPaths.push(
    defaultArtifactDir,
    defaultSchemaFilePath,
    defaultMetadataFilePath,
    defaultEventsFilePath,
    defaultTimelineFilePath
  );
  const runCommand = wrapRunCommandForStdoutArtifact(overrides.runCommand ?? vi.fn(async () => ({
    exitCode: 0,
    stdout:
      'runner prose\n{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED","summary":"done"}\n',
    stderr: ""
  })));
  return {
    pathExists: vi.fn(async () => true),
    prepareCodexRunnerFiles: vi.fn(async () => ({
      artifactDir: defaultArtifactDir,
      artifactDirRef:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001",
      schemaFilePath: defaultSchemaFilePath,
      metadataFilePath: defaultMetadataFilePath,
      eventsFilePath: defaultEventsFilePath,
      timelineFilePath: defaultTimelineFilePath
    })),
    now: vi
      .fn()
      .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
      .mockReturnValue(new Date("2026-05-01T10:00:05.000Z")),
    ...overrides,
    runCommand
  };
}

function wrapRunCommandForStdoutArtifact(
  runCommand: AgentRunnerBridgeDependencies["runCommand"]
): AgentRunnerBridgeDependencies["runCommand"] {
  const wrap = (
    implementation: AgentRunnerBridgeDependencies["runCommand"]
  ): AgentRunnerBridgeDependencies["runCommand"] =>
    async (invocation: AgentRunnerProcessInvocation) => {
      const result = await implementation(invocation);
      if (invocation.stdoutFilePath !== undefined) {
        try {
          await writeFile(invocation.stdoutFilePath, result.stdout, "utf8");
        } catch (error) {
          return {
            ...result,
            stdoutFileWriteError:
              error instanceof Error ? error.message : String(error)
          };
        }
      }
      return result;
    };
  if (!vi.isMockFunction(runCommand)) {
    return wrap(runCommand);
  }
  const mock = runCommand as AgentRunnerBridgeDependencies["runCommand"] & {
    getMockImplementation: () =>
      | AgentRunnerBridgeDependencies["runCommand"]
      | undefined;
    mockImplementation: (
      implementation: AgentRunnerBridgeDependencies["runCommand"]
    ) => void;
  };
  const implementation = mock.getMockImplementation();
  mock.mockImplementation(wrap(implementation ?? (async () => ({
    exitCode: 0,
    stdout: "",
    stderr: ""
  }))));
  return runCommand;
}

function codexAgentMessage(output: unknown): string {
  return `${JSON.stringify({
    type: "item.completed",
    timestamp: "2026-05-01T10:00:04.000Z",
    item: {
      type: "agent_message",
      text: JSON.stringify(output)
    }
  })}\n`;
}

function controlledRunnerProcess(
  control: (child: {
    stdout: PassThrough;
    stderr: PassThrough;
    close: (exitCode: number | null) => void;
  }) => void,
  options: { closeOnKill?: boolean } = {}
): ProcessSpawnPort {
  return () => {
    const events = new EventEmitter();
    const closeOnKill = options.closeOnKill ?? true;
    const child = {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: vi.fn(() => {
        if (closeOnKill) {
          setImmediate(() => events.emit("close", null));
        }
        return true;
      }),
      on: events.on.bind(events),
      once: events.once.bind(events)
    } as unknown as ProcessSpawnPipeChild;
    control({
      stdout: child.stdout as PassThrough,
      stderr: child.stderr as PassThrough,
      close: (exitCode) => {
        events.emit("close", exitCode);
      }
    });
    return child;
  };
}

describe("agentRunnerBridge", () => {
  it("builds compact continuation input without route decisions", () => {
    const payload = buildAgentRunnerContinuationPayload(baseInput());

    expect(payload).toEqual({
      kind: "pairflow.execute_pairflow_plan.continuation",
      workflow: "ExecutePairflowPlan",
      invocation_id: "invocation-001",
      plan_path: "/repo/plans/local-plan-watch-plan-v1.md",
      repo_path: "/repo",
      triggered_at: "2026-05-01T10:00:00.000Z",
      trigger: {
        source: "test",
        reason: "bubble_passed",
        observedAt: "2026-05-01T09:59:00.000Z",
        refs: ["bubble:demo"]
      }
    });
    expect(JSON.stringify(payload)).not.toContain("CreateTask");
    expect(JSON.stringify(payload)).not.toContain("CloseImplementationBubble");
  });

  it("captures a structured settled checkpoint result", async () => {
    const invocations: AgentRunnerProcessInvocation[] = [];
    const dependencies = deps();
    dependencies.runCommand = async (invocation) => {
      invocations.push(invocation);
      return {
        exitCode: 0,
        stdout:
          'runner prose\n{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED","summary":"done"}\n',
        stderr: ""
      };
    };

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent", args: ["run"], cwd: "/repo", idleTimeoutMs: 5000 },
      dependencies
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      invocationId: "invocation-001",
      reasonCode: "PLAN_SETTLED",
      startedAt: "2026-05-01T10:00:00.000Z",
      completedAt: "2026-05-01T10:00:05.000Z",
      runnerSummary: "done",
      command: {
        command: "agent",
        args: ["run"],
        cwd: "/repo",
        inputMode: "stdin_json",
        idleTimeoutMs: 5000
      }
    });
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.command).toBe("agent");
    expect(invocations[0]?.args).toEqual(["run"]);
    expect(invocations[0]?.cwd).toBe("/repo");
    expect(invocations[0]?.stdin).toContain('"workflow":"ExecutePairflowPlan"');
    expect(invocations[0]?.stdin).toContain(
      '"triggered_at":"2026-05-01T10:00:00.000Z"'
    );
  });

  it("uses input.now for the wrapped runner payload timestamp", async () => {
    const invocations: AgentRunnerProcessInvocation[] = [];
    const input = {
      ...baseInput(),
      now: new Date("2026-05-01T09:58:30.000Z")
    };

    await runExecutePairflowPlanContinuation(
      input,
      { command: "agent" },
      deps({
        runCommand: vi.fn(async (invocation: AgentRunnerProcessInvocation) => {
          invocations.push(invocation);
          return {
            exitCode: 0,
            stdout:
              '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n',
            stderr: ""
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      })
    );

    expect(invocations[0]?.stdin).toContain(
      '"triggered_at":"2026-05-01T09:58:30.000Z"'
    );
  });

  it("uses dependency clock for the wrapped runner payload timestamp when input has no now", async () => {
    const invocations: AgentRunnerProcessInvocation[] = [];
    const inputWithoutNow: AgentRunnerBridgeInput = {
      planPath: baseInput().planPath,
      repoPath: baseInput().repoPath,
      invocationId: baseInput().invocationId,
      trigger: baseInput().trigger
    };

    await runExecutePairflowPlanContinuation(
      inputWithoutNow,
      { command: "agent" },
      deps({
        runCommand: vi.fn(async (invocation: AgentRunnerProcessInvocation) => {
          invocations.push(invocation);
          return {
            exitCode: 0,
            stdout:
              '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n',
            stderr: ""
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T11:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T11:00:05.000Z"))
      })
    );

    expect(invocations[0]?.stdin).toContain(
      '"triggered_at":"2026-05-01T11:00:00.000Z"'
    );
  });

  it("captures a structured human checkpoint result", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"human_checkpoint","reason_code":"NEEDS_OPERATOR","summary":"blocked by policy"}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "human_checkpoint",
      reasonCode: "NEEDS_OPERATOR",
      runnerSummary: "blocked by policy"
    });
  });

  it("captures a structured blocker result from the runner", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"blocked","reason_code":"ARCHIVE_METADATA_MISSING","changed_artifacts":["plans/a.md"],"route_ledger_summary":"stopped"}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "ARCHIVE_METADATA_MISSING",
      changedArtifacts: ["plans/a.md"],
      routeLedgerSummary: "stopped"
    });
    expect(result.failureStage).toBeUndefined();
  });

  it("treats nullable structured-output optional fields as omitted", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED","summary":null,"changed_artifacts":null,"route_ledger_summary":null}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
    expect(result.runnerSummary).toBeUndefined();
    expect(result.changedArtifacts).toBeUndefined();
    expect(result.routeLedgerSummary).toBeUndefined();
  });

  it("accepts the last valid structured envelope before trailing diagnostics", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\ntrailing diagnostic after envelope\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
  });

  it("continues past trailing JSON diagnostics to the latest valid envelope", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n{"diagnostic":"timing"}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
  });

  it("uses the last valid structured envelope when multiple valid envelopes are present", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n{"status":"human_checkpoint","reason_code":"NEEDS_OPERATOR"}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "human_checkpoint",
      reasonCode: "NEEDS_OPERATOR"
    });
  });

  it("accepts a multi-line structured output envelope", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: [
            "runner prose",
            "{",
            '  "status": "settled_checkpoint",',
            '  "reason_code": "PLAN_SETTLED",',
            '  "summary": "line one\\nline two"',
            "}",
            "trailing diagnostic"
          ].join("\n"),
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED",
      runnerSummary: "line one\nline two"
    });
  });

  it("keeps JSON candidate extraction linear with many unmatched braces", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${"{".repeat(10_000)}{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n`,
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
  });

  it("fails closed before spawn when command config is missing", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      {},
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_CONFIG_MISSING",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("fails closed before spawn when plan path is unavailable", async () => {
    const dependencies = deps({
      pathExists: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_PLAN_PATH_UNAVAILABLE",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("fails closed before spawn when repo path is unavailable for legacy command runners", async () => {
    const dependencies = deps({
      pathExists: vi.fn(async () => false)
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_REPO_PATH_UNAVAILABLE",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("validates malformed payloads before legacy command runner filesystem checks", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), invocationId: "" },
      { command: "agent" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_PAYLOAD_INVALID",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("fails closed before spawn when direct idle timeout exceeds Node timer limits", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), idleTimeoutMs: MAX_NODE_TIMER_DELAY_MS + 1 },
      { command: "agent" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_PAYLOAD_INVALID",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("validates built-in runner idle timeout before preparing Codex artifacts", async () => {
    const dependencies = deps({
      prepareCodexRunnerFiles: vi.fn(async () => {
        throw new Error("should not prepare artifacts");
      })
    });

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), idleTimeoutMs: MAX_NODE_TIMER_DELAY_MS + 1 },
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_PAYLOAD_INVALID",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.pathExists).not.toHaveBeenCalled();
    expect(dependencies.prepareCodexRunnerFiles).not.toHaveBeenCalled();
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("keeps unsupported workflow distinct for legacy command runners", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), workflow: "CreateTask" },
      { command: "agent" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.pathExists).not.toHaveBeenCalled();
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("derives the built-in Codex invocation from plan authority only", async () => {
    const invocations: AgentRunnerProcessInvocation[] = [];
    const schemaFilePath = "/repo/.pairflow/runtime/custom/schema.json";
    const artifactRoot = await createTempDir();

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex", idleTimeoutMs: 5000 },
      deps({
        pathExists: vi.fn(async () => true),
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef:
            ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001",
          schemaFilePath,
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath: join(artifactRoot, "events.ndjson"),
          timelineFilePath: join(artifactRoot, "timeline.ndjson")
        })),
        runCommand: vi.fn(async (invocation: AgentRunnerProcessInvocation) => {
          invocations.push(invocation);
          return {
            exitCode: 0,
            stdout: codexAgentMessage({
              status: "settled_checkpoint",
              reason_code: "PLAN_SETTLED",
              summary: "continued"
            }),
            stderr: ""
          };
        })
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED",
      runnerSummary: "continued",
      command: {
        command: "codex",
        cwd: "/repo",
        inputMode: "none",
        idleTimeoutMs: 5000
      }
    });
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.args.slice(0, 4)).toEqual([
      "--dangerously-bypass-approvals-and-sandbox",
      "exec",
      "--json",
      "--cd"
    ]);
    expect(invocations[0]?.args[4]).toBe("/repo");
    expect(invocations[0]?.args).toContain("--output-schema");
    expect(invocations[0]?.args).toContain(schemaFilePath);
    expect(invocations[0]?.args).not.toContain("--output-last-message");
    expect(invocations[0]?.args.at(-1)).toContain("Use the ExecutePairflowPlan skill");
    expect(invocations[0]?.args.at(-1)).toContain(
      "Plan path: /repo/plans/local-plan-watch-plan-v1.md"
    );
    expect(invocations[0]?.args.at(-1)).toContain(
      "Treat the plan file and repo-local plan/task/bubble metadata as the routing authority."
    );
    expect(invocations[0]?.args.at(-1)).not.toContain("plan_path");
    expect(invocations[0]?.args.at(-1)).not.toContain("bubble_passed");
    expect(invocations[0]?.args.at(-1)).not.toContain("bubble:demo");
    expect(invocations[0]?.args.at(-1)).not.toContain("```");
    expect(invocations[0]?.stdin).toBeUndefined();
  });

  it("creates discoverable Codex artifact files and sanitizes invocation path segments", async () => {
    const repoPath = await createTempDir();
    const payload: AgentRunnerContinuationPayload = {
      ...buildAgentRunnerContinuationPayload({
        ...baseInput(),
        repoPath,
        invocationId: "../stale```id"
      }),
      repo_path: repoPath
    };

    const first = await prepareCodexRunnerFiles(
      payload,
      "2026-05-01T10:00:00.000Z"
    );
    const second = await prepareCodexRunnerFiles(
      payload,
      "2026-05-01T10:00:00.000Z"
    );

    expect(second.artifactDir).not.toBe(first.artifactDir);
    expect(second.artifactDir).toMatch(/-2$/u);
    expect(await readFile(first.eventsFilePath, "utf8")).toBe("");
    expect(await readFile(first.timelineFilePath, "utf8")).toBe("");
    const metadata = JSON.parse(await readFile(first.metadataFilePath, "utf8")) as {
      artifactDir: string;
      schemaFilePath: string;
      schemaVersion: number;
    };
    const schema = JSON.parse(await readFile(first.schemaFilePath, "utf8")) as {
      required: readonly string[];
    };
    expect(metadata.schemaVersion).toBe(1);
    expect(metadata.artifactDir).not.toMatch(/^\//u);
    expect(metadata.schemaFilePath).not.toMatch(/^\//u);
    expect(schema.required).toEqual([
      "status",
      "reason_code",
      "summary",
      "changed_artifacts",
      "route_ledger_summary"
    ]);
    expect(relative(repoPath, first.eventsFilePath)).toMatch(
      /^\.pairflow\/runtime\/plan-watch\/agent-runner\//u
    );
    expect(relative(repoPath, first.eventsFilePath)).not.toContain("..");
    expect(first.eventsFilePath).not.toContain("```");
  });

  it("normalizes plan slugs and artifact directory base names", () => {
    expect(planSlugFromPath("/repo/plans/2026-05-01-Local Plan Watch!!.md")).toBe(
      "local-plan-watch"
    );
    expect(planSlugFromPath("/repo/plans/2026-05-01-.md")).toBe("plan");
    expect(planSlugFromPath("/repo/plans/----.md")).toBe("plan");
    const now = new Date("2026-05-01T10:00:05.000Z");
    const localSegment = [
      `${now.getFullYear().toString().padStart(4, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`,
      `${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}-${now.getSeconds().toString().padStart(2, "0")}`
    ].join("_");
    expect(
      buildArtifactDirBaseName({
        planPath: "/repo/plans/2026-05-01-Local Plan Watch!!.md",
        invocationId: "../unsafe invocation",
        now
      })
    ).toBe(`${localSegment}_local-plan-watch_unsafe-invocation`);
  });

  it("rejects unsupported workflow before built-in Codex spawn", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), workflow: "CreateTask" },
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("rejects non-string workflow values as unsupported workflow guards", () => {
    const payload = {
      ...buildAgentRunnerContinuationPayload(baseInput()),
      workflow: 42
    } as unknown as AgentRunnerContinuationPayload;

    expect(validateContinuationPayload(payload)).toBe(
      "PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED"
    );
  });

  it("keeps unsupported workflow distinct when other payload fields are malformed", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), workflow: "CreateTask", invocationId: "" },
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.pathExists).not.toHaveBeenCalled();
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("rejects malformed built-in Codex payload before filesystem checks or spawn", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), invocationId: "" },
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_PAYLOAD_INVALID",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.pathExists).not.toHaveBeenCalled();
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("rejects invalid triggered_at timestamps in the Codex payload validator", () => {
    const payload: AgentRunnerContinuationPayload = {
      ...buildAgentRunnerContinuationPayload(baseInput()),
      triggered_at: "not-a-date"
    };

    expect(validateContinuationPayload(payload)).toBe(
      "PLAN_WATCH_RUNNER_PAYLOAD_INVALID"
    );
  });

  it("classifies Codex runner file preparation failures before spawning", async () => {
    const dependencies = deps({
      prepareCodexRunnerFiles: vi.fn(async () => {
        throw new Error("EACCES: cannot write schema");
      })
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
      failureStage: "precondition",
      command: null,
      stderr: "EACCES: cannot write schema"
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("blocks missing plan path for the built-in Codex runner before spawning", async () => {
    const dependencies = deps({
      pathExists: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true)
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_PLAN_PATH_UNAVAILABLE",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("parses Codex output from the final structured agent message", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: codexAgentMessage({
            status: "human_checkpoint",
            reason_code: "NEEDS_OPERATOR"
          }),
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "human_checkpoint",
      reasonCode: "NEEDS_OPERATOR"
    });
    expect(result.stdout).toContain("NEEDS_OPERATOR");
  });

  it("writes Codex event artifacts for non-mock test runCommand overrides", async () => {
    const artifactRoot = await createTempDir();
    const eventsFilePath = join(artifactRoot, "events.ndjson");
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const message = codexAgentMessage({
      status: "settled_checkpoint",
      reason_code: "PLAN_SETTLED"
    });
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath,
          timelineFilePath
        })),
        runCommand: async () => ({
          exitCode: 0,
          stdout: message,
          stderr: ""
        })
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
    expect(await readFile(eventsFilePath, "utf8")).toBe(message);
    expect(await readFile(timelineFilePath, "utf8")).toContain(
      "runner_completed"
    );
  });

  it("uses the last valid structured Codex agent message and writes raw plus timeline artifacts", async () => {
    const artifactRoot = await createTempDir();
    const eventsFilePath = join(artifactRoot, "events.ndjson");
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const sessionEvent = `${JSON.stringify({
      type: "thread.started",
      thread_id: "019df063-d8b1-7631-9be8-191fe2eef27c"
    })}\n`;
    const first = codexAgentMessage({
      status: "settled_checkpoint",
      reason_code: "FIRST"
    });
    const commandOutput = `${Array.from(
      { length: 21 },
      (_, index) => `line ${index}`
    ).join("\n")}\n`;
    const commandEvent = `${JSON.stringify({
      type: "item.completed",
      timestamp: "2026-05-01T10:00:03.000Z",
      item: {
        type: "command_execution",
        command: "pnpm test",
        status: "completed",
        exit_code: 0,
        output: commandOutput
      }
    })}\n`;
    const second = codexAgentMessage({
      status: "human_checkpoint",
      reason_code: "LAST",
      summary: "needs operator"
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath,
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${sessionEvent}${first}${commandEvent}${second}`,
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "human_checkpoint",
      reasonCode: "LAST",
      runnerSummary: "needs operator",
      codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c",
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    expect(await readFile(eventsFilePath, "utf8")).toBe(`${sessionEvent}${first}${commandEvent}${second}`);
    const timeline = (await readFile(timelineFilePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as {
        type: string;
        outputLineCount?: number;
        outputPreview?: string;
        codexSessionId?: string;
      });
    expect(timeline).toContainEqual({
      schemaVersion: 1,
      type: "codex_session_started",
      at: "2026-05-01T10:00:05.000Z",
      codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c"
    });
    expect(timeline.map((row) => row.type)).toContain("command_completed");
    expect(timeline.map((row) => row.type)).toContain("runner_completed");
    const commandRow = timeline.find((row) => row.type === "command_completed");
    expect(commandRow?.outputLineCount).toBe(21);
    expect(commandRow?.outputPreview).toContain("[1 lines omitted]");
    expect(commandRow?.outputPreview).not.toContain("line 20");
  });

  it("normalizes multipart Codex agent messages with a completed-at fallback timestamp", async () => {
    const artifactRoot = await createTempDir();
    const eventsFilePath = join(artifactRoot, "events.ndjson");
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const text = JSON.stringify({
      status: "settled_checkpoint",
      reason_code: "PLAN_SETTLED"
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath,
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${JSON.stringify({
            type: "item.completed",
            item: {
              type: "agent_message",
              content: [
                { text: text.slice(0, 24) },
                { text: text.slice(24) }
              ]
            }
          })}\n`,
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
    const timeline = (await readFile(timelineFilePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as {
        type: string;
        at: string;
        summary?: string;
      });
    expect(timeline.find((row) => row.type === "runner_status"))
      .toMatchObject({
        at: "2026-05-01T10:00:05.000Z",
        summary: text
      });
  });

  it("normalizes flat Codex agent_message events and skips non-text content arrays", async () => {
    const artifactRoot = await createTempDir();
    const eventsFilePath = join(artifactRoot, "events.ndjson");
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const text = JSON.stringify({
      status: "settled_checkpoint",
      reason_code: "PLAN_SETTLED"
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath,
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${JSON.stringify({
            type: "item.completed",
            item: {
              type: "agent_message",
              content: [{ type: "image" }]
            }
          })}\n${JSON.stringify({
            type: "agent_message",
            text
          })}\n`,
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
    const runnerStatusRows = (await readFile(timelineFilePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string; summary?: string })
      .filter((row) => row.type === "runner_status");
    const timeline = (await readFile(timelineFilePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string; rawType?: string });
    expect(runnerStatusRows).toHaveLength(1);
    expect(runnerStatusRows[0]).toMatchObject({
      type: "runner_status",
      summary: text
    });
    expect(timeline).toContainEqual({
      schemaVersion: 1,
      type: "runner_event_malformed",
      at: "2026-05-01T10:00:05.000Z",
      rawType: "agent_message"
    });
  });

  it("parses Codex JSONL streams without treating timeline as final authority", () => {
    const parsed = parseCodexJsonlStream(
      `${JSON.stringify({
        type: "thread.started",
        thread_id: "019df063-d8b1-7631-9be8-191fe2eef27c"
      })}\n${JSON.stringify({
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "echo '{\"status\":\"settled_checkpoint\",\"reason_code\":\"BAD\"}'"
        }
      })}\n`
    );

    expect(parsed.finalOutput).toBeNull();
    expect(parsed.malformed).toBe(false);
    expect(parsed.codexSessionId).toBe("019df063-d8b1-7631-9be8-191fe2eef27c");
  });

  it("parses multipart Codex agent_message content without a delimiter rewrite", () => {
    const text = JSON.stringify({
      status: "settled_checkpoint",
      reason_code: "PLAN_SETTLED"
    });
    const parsed = parseCodexJsonlStream(
      `${JSON.stringify({
        type: "item.completed",
        item: {
          type: "agent_message",
          content: [
            { text: text.slice(0, 24) },
            { text: text.slice(24) }
          ]
        }
      })}\n`
    );

    expect(parsed.finalOutput).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
  });

  it("drops parser final output when a JSON-like malformed line is present", () => {
    const parsed = parseCodexJsonlStream(
      `{not-json\n${codexAgentMessage({
        status: "settled_checkpoint",
        reason_code: "PLAN_SETTLED"
      })}`
    );

    expect(parsed.malformed).toBe(true);
    expect(parsed.finalOutput).toBeNull();
  });

  it("does not fall back to plain Codex stdout when the JSON stream has no structured agent message", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout:
            '{"status":"settled_checkpoint","reason_code":"STDOUT_SHOULD_NOT_WIN"}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      failureStage: "output",
      exitCode: 0
    });
  });

  it("blocks empty Codex JSON streams", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: "",
          stderr: '{"status":"settled_checkpoint","reason_code":"STDERR_SHOULD_NOT_WIN"}'
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      failureStage: "output"
    });
  });

  it("preserves Codex idle-timeout classification when the JSON stream has no final message", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async (): Promise<AgentRunnerProcessResult> => ({
          exitCode: null,
          stdout: "partial",
          stderr: "timed out",
          timedOut: true,
          timeoutKind: "idle"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_IDLE_TIMEOUT",
      failureStage: "timeout",
      exitCode: null,
      stdout: "partial",
      stderr: "timed out",
      artifactDir:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001"
    });
  });

  it("preserves Codex non-zero exit classification when the JSON stream has no final message", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 2,
          stdout: "failed stdout",
          stderr: "failed stderr"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      exitCode: 2,
      stdout: "failed stdout",
      stderr: "failed stderr",
      artifactDir:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001"
    });
  });

  it("normalizes Codex timeline even when the Codex process exits non-zero", async () => {
    const artifactRoot = await createTempDir();
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath: join(artifactRoot, "events.ndjson"),
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 2,
          stdout: `${JSON.stringify({
            type: "item.completed",
            timestamp: "2026-05-01T10:00:03.000Z",
            item: {
              type: "command_execution",
              command: "pnpm test",
              status: "completed",
              exit_code: 1,
              output: "failed"
            }
          })}\n`,
          stderr: "failed stderr"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    expect(await readFile(timelineFilePath, "utf8")).toContain(
      "command_completed"
    );
  });

  it("omits runner completion timeline rows when a failed Codex process emits a final message", async () => {
    const artifactRoot = await createTempDir();
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath: join(artifactRoot, "events.ndjson"),
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 2,
          stdout: `${JSON.stringify({
            type: "item.completed",
            timestamp: "2026-05-01T10:00:03.000Z",
            item: {
              type: "command_execution",
              command: "pnpm test",
              status: "completed",
              exit_code: 1,
              output: "failed"
            }
          })}\n${codexAgentMessage({
            status: "settled_checkpoint",
            reason_code: "PLAN_SETTLED"
          })}`,
          stderr: "failed stderr"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    const timeline = await readFile(timelineFilePath, "utf8");
    expect(timeline).toContain("command_completed");
    expect(timeline).not.toContain("runner_completed");
  });

  it("classifies Codex event artifact write failures as output blockers", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: "/repo/.pairflow/runtime/plan-watch/agent-runner/run",
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: "/repo/.pairflow/runtime/plan-watch/agent-runner/run/structured-output.schema.json",
          metadataFilePath: "/repo/.pairflow/runtime/plan-watch/agent-runner/run/metadata.json",
          eventsFilePath: "/definitely/missing/parent/events.ndjson",
          timelineFilePath: join(tmpdir(), "pairflow-agent-runner-timeline.ndjson")
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: codexAgentMessage({
            status: "settled_checkpoint",
            reason_code: "PLAN_SETTLED"
          }),
          stderr: "codex stderr"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
      failureStage: "output",
      command: {
        command: "codex",
        inputMode: "none"
      },
      exitCode: 0,
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    expect(result.stderr).toContain("ENOENT");
    expect(result.stderr).toContain("codex stderr");
  });

  it("preserves Codex process failure classification when timeline artifact writes fail", async () => {
    const artifactRoot = await createTempDir();
    const eventsFilePath = join(artifactRoot, "events.ndjson");
    const timelineFilePath = join(artifactRoot, "missing", "timeline.ndjson");
    await writeFile(eventsFilePath, codexAgentMessage({
      status: "settled_checkpoint",
      reason_code: "PLAN_SETTLED"
    }), "utf8");

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath,
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 2,
          stdout: codexAgentMessage({
            status: "settled_checkpoint",
            reason_code: "PLAN_SETTLED"
          }),
          stderr: "failed stderr"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      exitCode: 2,
      stderr: "failed stderr",
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
  });

  it("cleans up temporary timeline files when atomic rename fails", async () => {
    const artifactRoot = await createTempDir();
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    await mkdir(timelineFilePath);

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath: join(artifactRoot, "events.ndjson"),
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: codexAgentMessage({
            status: "settled_checkpoint",
            reason_code: "PLAN_SETTLED"
          }),
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED"
    });
    expect((await readdir(artifactRoot)).filter((entry) => entry.endsWith(".tmp")))
      .toEqual([]);
  });

  it("blocks plain non-JSON lines before later success-looking events", async () => {
    const artifactRoot = await createTempDir();
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const commandEvent = `${JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "pnpm test",
        status: "completed",
        exit_code: 0,
        output: "passed"
      }
    })}\n`;
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath: join(artifactRoot, "events.ndjson"),
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `codex startup diagnostic\n${commandEvent}${codexAgentMessage({
            status: "settled_checkpoint",
            reason_code: "PLAN_SETTLED"
          })}`,
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      failureStage: "output",
      exitCode: 0,
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    const timeline = await readFile(timelineFilePath, "utf8");
    expect(timeline).toContain("command_completed");
    expect(timeline).not.toContain("runner_completed");
  });

  it("blocks malformed JSON-like lines before later success-looking events", async () => {
    const artifactRoot = await createTempDir();
    const timelineFilePath = join(artifactRoot, "timeline.ndjson");
    const commandEvent = `${JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "pnpm test",
        status: "completed",
        exit_code: 1,
        output: "failed"
      }
    })}\n`;
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        prepareCodexRunnerFiles: vi.fn(async () => ({
          artifactDir: artifactRoot,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(artifactRoot, "schema.json"),
          metadataFilePath: join(artifactRoot, "metadata.json"),
          eventsFilePath: join(artifactRoot, "events.ndjson"),
          timelineFilePath
        })),
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: `${commandEvent}{not-json\n${codexAgentMessage({
            status: "settled_checkpoint",
            reason_code: "PLAN_SETTLED"
          })}`,
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      failureStage: "output",
      exitCode: 0,
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    const timeline = await readFile(timelineFilePath, "utf8");
    expect(timeline).toContain("command_completed");
    expect(timeline).not.toContain("runner_completed");
  });

  it("caps unrecognized Codex timeline rows", () => {
    const timeline = normalizeCodexTimeline({
      events: Array.from({ length: 30 }, (_, index) => ({
        line: JSON.stringify({ type: `diagnostic.${index}` }),
        value: { type: `diagnostic.${index}` }
      })),
      finalOutput: null,
      completedAt: "2026-05-01T10:00:05.000Z"
    });

    expect(
      timeline.filter((row) => row.type === "runner_event_unrecognized")
    ).toHaveLength(20);
  });

  it("classifies contradictory command event/status pairs as completed when either side completed", () => {
    const timeline = normalizeCodexTimeline({
      events: [
        {
          line: "{}",
          value: {
            type: "item.started",
            item: {
              type: "command_execution",
              command: "pnpm test",
              status: "completed",
              exit_code: 0,
              output: "done"
            }
          }
        },
        {
          line: "{}",
          value: {
            type: "item.completed",
            item: {
              type: "command_execution",
              command: "pnpm lint",
              status: "in_progress"
            }
          }
        }
      ],
      finalOutput: null,
      completedAt: "2026-05-01T10:00:05.000Z"
    });

    expect(timeline.map((row) => row.type)).toEqual([
      "command_completed",
      "command_completed"
    ]);
  });

  it("blocks unsupported built-in runner backend before spawning", async () => {
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "shell-script" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("blocks missing repo path for the built-in Codex runner before spawning", async () => {
    const dependencies = deps({
      pathExists: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true)
    });

    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_REPO_PATH_UNAVAILABLE",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("keeps Codex spawn error messages without ENOENT code in the generic bucket", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => {
          throw new Error("ENOENT");
        })
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      stderr: "ENOENT",
      artifactDir:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001"
    });
  });

  it("classifies Codex spawn ENOENT error codes with the Codex-specific reason code", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => {
          throw Object.assign(new Error("spawn failed"), { code: "ENOENT" });
        })
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_CODEX_UNAVAILABLE",
      failureStage: "spawn",
      stderr: "spawn failed",
      artifactDir:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001"
    });
  });

  it("keeps non-ENOENT Codex runner rejections in the generic spawn bucket", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { backend: "codex" },
      deps({
        runCommand: vi.fn(async () => {
          throw new Error("permission denied");
        })
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      stderr: "permission denied",
      artifactDir:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-local-plan-watch-plan-v1_invocation-001"
    });
  });

  it("classifies spawn errors as blockers", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "missing-agent" },
      deps({
        runCommand: vi.fn(async () => {
          throw new Error("ENOENT");
        })
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      stderr: "ENOENT"
    });
  });

  it("classifies idle timeout as blocker and preserves output diagnostics", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent", idleTimeoutMs: 100 },
      deps({
        runCommand: vi.fn(async (): Promise<AgentRunnerProcessResult> => ({
          exitCode: null,
          stdout: "partial stdout",
          stderr: "partial stderr",
          timedOut: true,
          timeoutKind: "idle"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_IDLE_TIMEOUT",
      failureStage: "timeout",
      exitCode: null,
      stdout: "partial stdout",
      stderr: "partial stderr"
    });
  });

  it("passes the stop signal to the runner command invocation", async () => {
    const controller = new AbortController();
    const invocations: AgentRunnerProcessInvocation[] = [];

    await runExecutePairflowPlanContinuation(
      { ...baseInput(), stopSignal: controller.signal },
      { command: "agent" },
      deps({
        runCommand: vi.fn(async (invocation: AgentRunnerProcessInvocation) => {
          invocations.push(invocation);
          return {
            exitCode: 0,
            stdout:
              '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n',
            stderr: ""
          };
        })
      })
    );

    expect(invocations[0]?.signal).toBe(controller.signal);
  });

  it("classifies pre-aborted runner input without spawning", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), stopSignal: controller.signal },
      { command: "agent" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort"
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("does not prepare Codex runner files when the stop signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = deps();

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), stopSignal: controller.signal },
      { backend: "codex" },
      dependencies
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort",
      command: null
    });
    expect(dependencies.pathExists).not.toHaveBeenCalled();
    expect(dependencies.prepareCodexRunnerFiles).not.toHaveBeenCalled();
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("classifies non-zero exit as blocker and ignores success-like prose", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 2,
          stdout: "settled_checkpoint complete\n",
          stderr: "failed"
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      exitCode: 2,
      stdout: "settled_checkpoint complete\n"
    });
  });

  it("classifies signal-style null exit in the non-zero exit bucket", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: null,
          stdout: "terminated",
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      exitCode: null
    });
  });

  it("classifies malformed or unknown structured output as blocker", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent" },
      deps({
        runCommand: vi.fn(async () => ({
          exitCode: 0,
          stdout: '{"status":"CreateTask","reason_code":"BAD"}\n',
          stderr: ""
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      failureStage: "output"
    });
  });

  it("can pass the compact payload as the final argv value", async () => {
    const invocations: AgentRunnerProcessInvocation[] = [];
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent", args: ["continue"], inputMode: "arg_json" },
      deps({
        runCommand: vi.fn(async (invocation: AgentRunnerProcessInvocation) => {
          invocations.push(invocation);
          return {
            exitCode: 0,
            stdout:
              '{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED"}\n',
            stderr: ""
          };
        })
      })
    );

    expect(result.status).toBe("settled_checkpoint");
    expect(invocations[0]).toMatchObject({
      args: ["continue", expect.stringContaining('"invocation_id":"invocation-001"')]
    });
    expect(invocations[0]?.stdin).toBeUndefined();
  });

  it("terminates the default child process adapter on idle timeout", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: ["-e", "setInterval(() => undefined, 1000);"],
      cwd: process.cwd(),
      idleTimeoutMs: 200
    });

    expect(result.timedOut).toBe(true);
    expect(result.timeoutKind).toBe("idle");
    expect(result.exitCode).toBeNull();
  });

  it("resets the idle timeout on default-adapter stdout activity", async () => {
    const result = await runAgentRunnerCommand(
      {
        command: "agent",
        args: [],
        cwd: process.cwd(),
        idleTimeoutMs: 75
      },
      controlledRunnerProcess(({ stdout, close }) => {
        setTimeout(() => stdout.write("tick-0\n"), 0);
        setTimeout(() => stdout.write("tick-1\n"), 50);
        setTimeout(() => stdout.write("tick-2\n"), 100);
        setTimeout(() => stdout.write("tick-3\n"), 150);
        setTimeout(() => close(0), 180);
      })
    );

    expect(result.exitCode).toBe(0);
    expect(result).not.toHaveProperty("timedOut");
    expect(result.stdout).toContain("tick-3");
  });

  it("resets the idle timeout on default-adapter stderr activity", async () => {
    const result = await runAgentRunnerCommand(
      {
        command: "agent",
        args: [],
        cwd: process.cwd(),
        idleTimeoutMs: 75
      },
      controlledRunnerProcess(({ stderr, close }) => {
        setTimeout(() => stderr.write("tick-0\n"), 0);
        setTimeout(() => stderr.write("tick-1\n"), 50);
        setTimeout(() => stderr.write("tick-2\n"), 100);
        setTimeout(() => stderr.write("tick-3\n"), 150);
        setTimeout(() => close(0), 180);
      })
    );

    expect(result.exitCode).toBe(0);
    expect(result).not.toHaveProperty("timedOut");
    expect(result.stderr).toContain("tick-3");
  });

  it("keeps large structured envelopes available beyond the capture tail budget", async () => {
    const largeSummary = "x".repeat(70_000);
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        `process.stdout.write(${JSON.stringify(JSON.stringify({
          status: "settled_checkpoint",
          reason_code: "PLAN_SETTLED",
          summary: largeSummary
        }))})`
      ],
      cwd: process.cwd(),
      idleTimeoutMs: 1_000
    });

    expect(result.stdout).toContain('"reason_code":"PLAN_SETTLED"');
    expect(result.stdout).toContain(largeSummary);
  });

  it("normalizes timeout exits to null even when the child exits during grace", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        "process.on('SIGTERM', () => process.exit(143)); setInterval(() => undefined, 1000);"
      ],
      cwd: process.cwd(),
      idleTimeoutMs: 200
    });

    expect(result.timedOut).toBe(true);
    expect(result.timeoutKind).toBe("idle");
    expect(result.exitCode).toBeNull();
  });

  it("settles the default child process adapter when SIGTERM is trapped", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        "process.on('SIGTERM', () => undefined); setInterval(() => undefined, 1000);"
      ],
      cwd: process.cwd(),
      idleTimeoutMs: 200
    });

    expect(result.timedOut).toBe(true);
    expect(result.timeoutKind).toBe("idle");
    expect(result.exitCode).toBeNull();
  });

  it("preserves idle timeout classification when an abort signal arrives during kill grace", async () => {
    const controller = new AbortController();
    const resultPromise = runAgentRunnerCommand(
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => undefined, 1000);"],
        cwd: process.cwd(),
        idleTimeoutMs: 10,
        signal: controller.signal
      },
      controlledRunnerProcess(() => undefined, { closeOnKill: false })
    );

    await new Promise((resolve) => setTimeout(resolve, 25));
    controller.abort();
    const result = await resultPromise;

    expect(result.timedOut).toBe(true);
    expect(result.timeoutKind).toBe("idle");
    expect(result).not.toHaveProperty("aborted");
    expect(result.exitCode).toBeNull();
  });

  it("preserves normal close classification when close races with idle timer finalization", async () => {
    const result = await runAgentRunnerCommand(
      {
        command: process.execPath,
        args: ["-e", "process.exit(0);"],
        cwd: process.cwd(),
        idleTimeoutMs: 1
      },
      controlledRunnerProcess(({ close }) => {
        setTimeout(() => close(0), 1);
      })
    );

    expect(result.exitCode).toBe(0);
    expect(result).not.toHaveProperty("timedOut");
    expect(result).not.toHaveProperty("aborted");
  });

  it("classifies default-adapter timeout through runExecutePairflowPlanContinuation", async () => {
    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), planPath: process.cwd(), repoPath: process.cwd() },
      {
        command: process.execPath,
        args: [
          "-e",
          "process.on('SIGTERM', () => undefined); setInterval(() => undefined, 1000);"
        ],
        idleTimeoutMs: 200
      },
      {
        pathExists: async () => true,
        runCommand: (invocation) =>
          runAgentRunnerCommand(
            invocation,
            controlledRunnerProcess(({ stdout }) => {
              setTimeout(() => stdout.write("active\n"), 0);
            })
          ),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_IDLE_TIMEOUT",
      failureStage: "timeout",
      exitCode: null
    });
  });

  it("aborts the default child process adapter when the stop signal fires", async () => {
    const controller = new AbortController();
    const resultPromise = runAgentRunnerCommand({
      command: process.execPath,
      args: ["-e", "setInterval(() => undefined, 1000);"],
      cwd: process.cwd(),
      idleTimeoutMs: 60_000,
      signal: controller.signal
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await resultPromise;

    expect(result.aborted).toBe(true);
    expect(result.exitCode).toBeNull();
  });

  it("classifies default-adapter abort through runExecutePairflowPlanContinuation", async () => {
    const controller = new AbortController();
    const resultPromise = runExecutePairflowPlanContinuation(
      {
        ...baseInput(),
        planPath: process.cwd(),
        repoPath: process.cwd(),
        stopSignal: controller.signal
      },
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => undefined, 1000);"],
        idleTimeoutMs: 60_000
      },
      {
        pathExists: async () => true,
        runCommand: (invocation) =>
          runAgentRunnerCommand(
            invocation,
            controlledRunnerProcess(({ stdout }) => {
              setTimeout(() => stdout.write("active\n"), 0);
            })
          ),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await resultPromise;

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort",
      exitCode: null
    });
  });

  it("keeps explicit abort distinct after recent runner activity", async () => {
    const controller = new AbortController();
    const resultPromise = runExecutePairflowPlanContinuation(
      {
        ...baseInput(),
        planPath: process.cwd(),
        repoPath: process.cwd(),
        stopSignal: controller.signal
      },
      {
        command: process.execPath,
        args: [
          "-e",
          "process.stdout.write('active\\n'); setInterval(() => undefined, 1000);"
        ],
        idleTimeoutMs: 60_000
      },
      {
        pathExists: async () => true,
        runCommand: (invocation) =>
          runAgentRunnerCommand(
            invocation,
            controlledRunnerProcess(({ stdout }) => {
              setTimeout(() => stdout.write("active\n"), 0);
            })
          ),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 300));
    controller.abort();
    const result = await resultPromise;

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort",
      exitCode: null
    });
  });

  it("keeps explicit abort distinct when a child ignores SIGTERM past the idle deadline", async () => {
    const controller = new AbortController();
    const resultPromise = runExecutePairflowPlanContinuation(
      {
        ...baseInput(),
        planPath: process.cwd(),
        repoPath: process.cwd(),
        stopSignal: controller.signal
      },
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => undefined, 1000);"],
        idleTimeoutMs: 20
      },
      {
        pathExists: async () => true,
        runCommand: (invocation) =>
          runAgentRunnerCommand(
            invocation,
            controlledRunnerProcess(
              ({ stdout }) => {
                setTimeout(() => stdout.write("active\n"), 0);
                setTimeout(() => stdout.write("still-active-after-abort\n"), 10);
              },
              { closeOnKill: false }
            )
          ),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await resultPromise;

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort",
      exitCode: null
    });
  });

  it("does not postpone idle-timeout kill grace when output arrives after timeout", async () => {
    const startedAt = Date.now();
    const resultPromise = runExecutePairflowPlanContinuation(
      {
        ...baseInput(),
        planPath: process.cwd(),
        repoPath: process.cwd()
      },
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => process.stdout.write('late\\n'), 10);"],
        idleTimeoutMs: 20
      },
      {
        pathExists: async () => true,
        runCommand: (invocation) =>
          runAgentRunnerCommand(
            invocation,
            controlledRunnerProcess(
              ({ stdout }) => {
                for (const delayMs of [30, 80, 130, 180, 230, 280, 330, 380, 430, 480]) {
                  setTimeout(() => stdout.write("late\n"), delayMs).unref();
                }
              },
              { closeOnKill: false }
            )
          ),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    const result = await resultPromise;

    expect(Date.now() - startedAt).toBeLessThan(450);
    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_IDLE_TIMEOUT",
      failureStage: "timeout",
      exitCode: null
    });
  });

  it("passes only explicit env values when default adapter env is configured", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        [
          "const summary = `${process.env.PAIRFLOW_RUNNER_ONLY}:${String(process.env.PATH)}`;",
          "console.log(JSON.stringify({status:'settled_checkpoint',reason_code:'PLAN_SETTLED',summary}));"
        ].join("")
      ],
      cwd: process.cwd(),
      env: { PAIRFLOW_RUNNER_ONLY: "yes" },
      idleTimeoutMs: 1000
    });

    expect(result.exitCode).toBe(0);
    expect(result).not.toHaveProperty("timedOut");
    expect(result.stdout).toContain('"summary":"yes:undefined"');
  });

  it("bounds default-adapter stdout and stderr capture", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        [
          "process.stdout.write('x'.repeat(70000));",
          "process.stderr.write('y'.repeat(70000));"
        ].join("")
      ],
      cwd: process.cwd(),
      idleTimeoutMs: 1000
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeLessThanOrEqual(64 * 1024);
    expect(result.stderr.length).toBeLessThanOrEqual(64 * 1024);
  });

  it("tees full default-adapter stdout to the configured artifact file", async () => {
    const root = await createTempDir();
    const stdoutFilePath = join(root, "events.ndjson");
    const line = `${JSON.stringify({
      type: "item.completed",
      item: {
        type: "agent_message",
        text: JSON.stringify({
          status: "settled_checkpoint",
          reason_code: "PLAN_SETTLED"
        })
      }
    })}\n`;

    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        `process.stdout.write(${JSON.stringify(line.repeat(5000))});`
      ],
      cwd: process.cwd(),
      idleTimeoutMs: 1000,
      stdoutFilePath
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeLessThanOrEqual(64 * 1024);
    expect(await readFile(stdoutFilePath, "utf8")).toBe(line.repeat(5000));
  });

  it("drains stdout artifact writes accepted before normal close settlement", async () => {
    const root = await createTempDir();
    const stdoutFilePath = join(root, "events.ndjson");
    let resolveFirstWrite: (() => void) | undefined;
    let observeFirstWrite: (() => void) | undefined;
    const firstWriteStarted = new Promise<void>((resolve) => {
      observeFirstWrite = resolve;
    });
    const firstWriteRelease = new Promise<void>((resolve) => {
      resolveFirstWrite = resolve;
    });
    let writeCount = 0;

    const resultPromise = runAgentRunnerCommand(
      {
        command: process.execPath,
        args: [
          "-e",
          [
            "process.stdout.write('first\\n');",
            "setTimeout(() => process.stdout.write('second\\n'), 10);"
          ].join("")
        ],
        cwd: process.cwd(),
        idleTimeoutMs: 1000,
        stdoutFilePath
      },
      undefined,
      async (path, data, encoding) => {
        writeCount += 1;
        if (writeCount === 1) {
          observeFirstWrite?.();
          await firstWriteRelease;
        }
        await appendFile(path, data, encoding);
      }
    );

    await firstWriteStarted;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    resolveFirstWrite?.();
    const result = await resultPromise;

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("first\nsecond\n");
    expect(result).not.toHaveProperty("stdoutFileWriteError");
    expect(await readFile(stdoutFilePath, "utf8")).toBe("first\nsecond\n");
  });

  it("captures stdout artifact write failures without throwing from the data handler", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: ["-e", "process.stdout.write('hello');"],
      cwd: process.cwd(),
      idleTimeoutMs: 1000,
      stdoutFilePath: "/definitely/missing/parent/events.ndjson"
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello");
    expect(result.stderr).toBe("");
    expect(result.stdoutFileWriteError).toContain("ENOENT");
  });

  it("stops stdout artifact appends after the first persistence failure", async () => {
    const root = await createTempDir();
    const lateParent = join(root, "late-parent");
    const stdoutFilePath = join(lateParent, "events.ndjson");

    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: [
        "-e",
        [
          "const fs = require('node:fs');",
          "process.stdout.write('first');",
          "setTimeout(() => {",
          `  fs.mkdirSync(${JSON.stringify(lateParent)}, { recursive: true });`,
          "  process.stdout.write('second');",
          "}, 50);"
        ].join("")
      ],
      cwd: process.cwd(),
      idleTimeoutMs: 1000,
      stdoutFilePath
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("firstsecond");
    expect(result.stderr).toBe("");
    expect(result.stdoutFileWriteError).toContain("ENOENT");
    await expect(readFile(stdoutFilePath, "utf8")).rejects.toThrow(/ENOENT/u);
  });

  it("blocks Codex JSON runs when the default adapter cannot fully persist events.ndjson", async () => {
    const root = await createTempDir();
    const runnerPath = join(root, "codex-json-runner.js");
    const eventsFilePath = join(root, "events.ndjson");
    const timelineFilePath = join(root, "timeline.ndjson");
    const firstMessage = codexAgentMessage({
      status: "settled_checkpoint",
      reason_code: "PARTIAL_SHOULD_NOT_WIN"
    });
    const secondMessage = codexAgentMessage({
      status: "settled_checkpoint",
      reason_code: "PLAN_SETTLED"
    });
    await writeFile(
      runnerPath,
      [
        `#!${process.execPath}`,
        "const fs = require('node:fs');",
        `process.stdout.write(${JSON.stringify(firstMessage)});`,
        "const eventsFilePath = process.env.PAIRFLOW_TEST_EVENTS_FILE;",
        "if (eventsFilePath === undefined) { process.exit(1); }",
        "const waitForPersistedFirstChunk = () => {",
        "  const stat = fs.existsSync(eventsFilePath) ? fs.statSync(eventsFilePath) : undefined;",
        `  if (stat !== undefined && stat.size >= ${firstMessage.length}) {`,
        "    fs.chmodSync(eventsFilePath, 0o400);",
        `    process.stdout.write(${JSON.stringify(secondMessage)});`,
        "    return;",
        "  }",
        "  setTimeout(waitForPersistedFirstChunk, 5);",
        "};",
        "waitForPersistedFirstChunk();"
      ].join("\n"),
      "utf8"
    );
    await chmod(runnerPath, 0o755);

    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), planPath: process.cwd(), repoPath: process.cwd() },
      {
        backend: "codex",
        command: runnerPath,
        env: { PAIRFLOW_TEST_EVENTS_FILE: eventsFilePath }
      },
      {
        pathExists: async () => true,
        runCommand: runAgentRunnerCommand,
        prepareCodexRunnerFiles: async () => ({
          artifactDir: root,
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath: join(root, "schema.json"),
          metadataFilePath: join(root, "metadata.json"),
          eventsFilePath,
          timelineFilePath
        }),
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
      failureStage: "output",
      artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run"
    });
    expect(result.stderr).toContain("EACCES");
    expect(await readFile(eventsFilePath, "utf8")).toBe(firstMessage);
    await expect(readFile(timelineFilePath, "utf8")).rejects.toThrow(/ENOENT/u);
  });

  it("preserves a structured envelope before trailing diagnostics exceed the capture limit", async () => {
    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), planPath: process.cwd(), repoPath: process.cwd() },
      {
        command: process.execPath,
        args: [
          "-e",
          [
            "process.stdout.write(JSON.stringify({status:'settled_checkpoint',reason_code:'PLAN_SETTLED'}));",
            "process.stdout.write('\\n');",
            "process.stdout.write('d'.repeat(70000));"
          ].join("")
        ],
        idleTimeoutMs: 1000
      },
      {
        pathExists: async () => true,
        runCommand: runAgentRunnerCommand,
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
  });

  it("retains trailing diagnostics when the structured envelope consumes the capture budget", async () => {
    const result = await runExecutePairflowPlanContinuation(
      { ...baseInput(), planPath: process.cwd(), repoPath: process.cwd() },
      {
        command: process.execPath,
        args: [
          "-e",
          [
            "process.stdout.write(JSON.stringify({",
            "status:'settled_checkpoint',",
            "reason_code:'PLAN_SETTLED',",
            "summary:'s'.repeat(70000)",
            "}));",
            "process.stdout.write('\\ndiagnostic-tail');"
          ].join("")
        ],
        idleTimeoutMs: 1000
      },
      {
        pathExists: async () => true,
        runCommand: runAgentRunnerCommand,
        now: vi
          .fn()
          .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
          .mockReturnValue(new Date("2026-05-01T10:00:05.000Z"))
      }
    );

    expect(result).toMatchObject({
      status: "settled_checkpoint",
      reasonCode: "PLAN_SETTLED"
    });
    expect(result.stdout).toContain("diagnostic-tail");
  });
});
