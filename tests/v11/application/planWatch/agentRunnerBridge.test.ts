import { describe, expect, it, vi } from "vitest";

import {
  buildAgentRunnerContinuationPayload,
  runExecutePairflowPlanContinuation
} from "../../../../src/v11/application/planWatch/agentRunnerBridge.js";
import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerBridgeInput,
  AgentRunnerProcessInvocation,
  AgentRunnerProcessResult
} from "../../../../src/v11/application/planWatch/agentRunnerBridgeContract.js";
import { runAgentRunnerCommand } from "../../../../src/v11/defaults/planWatch/agentRunnerBridgeDefaults.js";

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
  return {
    pathExists: vi.fn(async () => true),
    runCommand: vi.fn(async () => ({
      exitCode: 0,
      stdout:
        'runner prose\n{"status":"settled_checkpoint","reason_code":"PLAN_SETTLED","summary":"done"}\n',
      stderr: ""
    })),
    now: vi
      .fn()
      .mockReturnValueOnce(new Date("2026-05-01T10:00:00.000Z"))
      .mockReturnValue(new Date("2026-05-01T10:00:05.000Z")),
    ...overrides
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
      { command: "agent", args: ["run"], cwd: "/repo", timeoutMs: 5000 },
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
        timeoutMs: 5000
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
      reasonCode: "AGENT_RUNNER_CONFIG_MISSING",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
  });

  it("fails closed before spawn when plan path is unavailable", async () => {
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
      reasonCode: "PLAN_PATH_UNAVAILABLE",
      failureStage: "precondition",
      command: null
    });
    expect(dependencies.runCommand).not.toHaveBeenCalled();
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

  it("classifies timeout as blocker and preserves output diagnostics", async () => {
    const result = await runExecutePairflowPlanContinuation(
      baseInput(),
      { command: "agent", timeoutMs: 100 },
      deps({
        runCommand: vi.fn(async (): Promise<AgentRunnerProcessResult> => ({
          exitCode: null,
          stdout: "partial stdout",
          stderr: "partial stderr",
          timedOut: true
        }))
      })
    );

    expect(result).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_TIMEOUT",
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

  it("terminates the default child process adapter on timeout", async () => {
    const result = await runAgentRunnerCommand({
      command: process.execPath,
      args: ["-e", "setInterval(() => undefined, 1000);"],
      cwd: process.cwd(),
      timeoutMs: 200
    });

    expect(result.timedOut).toBe(true);
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
      timeoutMs: 200
    });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
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
        timeoutMs: 200
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
      status: "blocked",
      reasonCode: "AGENT_RUNNER_TIMEOUT",
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
      timeoutMs: 60_000,
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
        timeoutMs: 60_000
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
      timeoutMs: 1000
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
      timeoutMs: 1000
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeLessThanOrEqual(64 * 1024);
    expect(result.stderr.length).toBeLessThanOrEqual(64 * 1024);
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
        timeoutMs: 1000
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
});
