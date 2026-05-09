import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPlanWatchHelpText,
  parsePlanWatchCommandOptions,
  renderPlanWatchEventText,
  renderPlanWatchRunnerEventLine,
  renderPlanWatchRunnerTimelineLine,
  PlanWatchTerminalRenderer,
  runPlanWatchCommand,
  renderPlanWatchText
} from "../../src/cli/commands/plan/watch.js";
import {
  asAgentRunnerBridgeRunnerReasonCode,
  type AgentRunnerBridgeResult
} from "../../src/v11/application/planWatch/agentRunnerBridgeContract.js";
import type {
  LinkedBubbleTriggerCandidate
} from "../../src/v11/application/planWatch/linkedBubbleTriggerIndexContract.js";
import {
  PLAN_WATCH_LEDGER_SCHEMA_VERSION,
  type PlanWatchLedgerData,
  type PlanWatchLedgerRecord
} from "../../src/v11/application/planWatch/planWatchLedgerContract.js";
import type {
  PlanWatchLoopDependencies
} from "../../src/v11/application/planWatch/planWatchLoopContract.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-plan-watch-command-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("plan watch command", () => {
  it("parses required options and defaults runner input mode", () => {
    const parsed = parsePlanWatchCommandOptions(
      [
        "plans/local-plan-watch-plan-v1.md",
        "--repo",
        "/repo",
        "--once",
        "--runner-command",
        "agent",
        "--run-now",
        "--force-run",
        "--follow-runner",
        "--runner-arg",
        "run",
        "--runner-arg=--fast"
      ],
      "/cwd"
    );

    expect(parsed).toMatchObject({
      help: false,
      planPath: "plans/local-plan-watch-plan-v1.md",
      repo: "/repo",
      once: true,
      runNow: true,
      forceRun: true,
      followRunner: true,
      runnerCommand: "agent",
      runnerArgs: ["run", "--fast"],
      runnerInputMode: "stdin_json",
      intervalSeconds: 60
    });
  });

  it("rejects invalid intervals", () => {
    expect(() =>
      parsePlanWatchCommandOptions([
        "plans/local-plan-watch-plan-v1.md",
        "--interval-seconds",
        "0"
      ])
    ).toThrow("PLAN_WATCH_INTERVAL_INVALID");
  });

  it("requires run-now for force-run", () => {
    expect(() =>
      parsePlanWatchCommandOptions([
        "plans/local-plan-watch-plan-v1.md",
        "--force-run"
      ])
    ).toThrow("PLAN_WATCH_FORCE_RUN_REQUIRES_RUN_NOW");
  });

  it("renders blocked reason without route authority output", () => {
    const text = renderPlanWatchText({
      status: "blocked",
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      scannedCandidateCount: 1,
      deferredCandidateCount: 0,
      diagnostics: [],
      blockedReasonKind: "runner_config_missing",
      onceExit: true
    });

    expect(text).toContain("blocked_reason=runner_config_missing");
    expect(text).not.toContain("route_class");
    expect(text).not.toContain("CloseImplementationBubble");
  });

  it("renders plan watch progress events for terminal output", () => {
    const text = renderPlanWatchEventText({
      kind: "runner_started",
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      invocationId: "invocation-1",
      dedupeKey: "dedupe-1",
      triggerReason: "linked_bubble_approval_ready",
      candidate: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL",
        observedAt: "2026-05-01T09:00:00.000Z",
        statusRef: "bubble:3-watch-loop-impl:round:2"
      }
    });

    expect(text).toContain("plan watch: runner started");
    expect(text).toContain("invocation=invocation-1");
    expect(text).toContain("bubble=3-watch-loop-impl");
  });

  it("renders runner artifact and timeline rows for follow output", () => {
    const artifactText = renderPlanWatchEventText({
      kind: "runner_artifact_ready",
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      invocationId: "invocation-1",
      dedupeKey: "dedupe-1",
      triggerReason: "linked_bubble_approval_ready",
      candidate: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      artifactFiles: {
        artifactDir: "/repo/.pairflow/runtime/plan-watch/agent-runner/run",
        artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
        schemaFilePath: "/repo/.pairflow/runtime/plan-watch/agent-runner/run/schema.json",
        metadataFilePath: "/repo/.pairflow/runtime/plan-watch/agent-runner/run/metadata.json",
        eventsFilePath: "/repo/.pairflow/runtime/plan-watch/agent-runner/run/events.ndjson",
        timelineFilePath: "/repo/.pairflow/runtime/plan-watch/agent-runner/run/timeline.ndjson"
      }
    });
    const timelineText = renderPlanWatchRunnerTimelineLine(
      JSON.stringify({
        schemaVersion: 1,
        type: "runner_completed",
        status: "settled_checkpoint",
        reasonCode: "PLAN_COMPLETE",
        summary: "done"
      })
    );
    const eventText = renderPlanWatchRunnerEventLine(
      JSON.stringify({
        type: "thread.started",
        thread_id: "019df063-d8b1-7631-9be8-191fe2eef27c"
      })
    );

    expect(artifactText).toContain("plan watch: runner artifacts");
    expect(artifactText).toContain("dir=.pairflow/runtime/plan-watch/agent-runner/run");
    expect(eventText).toBe(
      "runner: codex session - 019df063-d8b1-7631-9be8-191fe2eef27c"
    );
    expect(timelineText).toBe(
      "runner: completed PLAN_COMPLETE - done"
    );
  });

  it("renders Codex session id on runner completion when available", () => {
    const text = renderPlanWatchEventText({
      kind: "runner_completed",
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      invocationId: "invocation-1",
      dedupeKey: "dedupe-1",
      triggerReason: "linked_bubble_approval_ready",
      candidate: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      runnerResult: {
        status: "settled_checkpoint",
        invocationId: "invocation-1",
        startedAt: "2026-05-01T09:00:00.000Z",
        completedAt: "2026-05-01T09:01:00.000Z",
        reasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_COMPLETE"),
        command: null,
        codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c"
      }
    });

    expect(text).toContain("plan watch: runner completed");
    expect(text).toContain("codex_session=019df063-d8b1-7631-9be8-191fe2eef27c");
  });

  it("overwrites idle progress on TTY and flushes before real events", () => {
    const chunks: string[] = [];
    const renderer = new PlanWatchTerminalRenderer({
      isTty: true,
      color: false,
      write: (text) => {
        chunks.push(text);
      }
    });
    const idleResult = {
      status: "idle" as const,
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      scannedCandidateCount: 0,
      deferredCandidateCount: 0,
      diagnostics: [],
      onceExit: false
    };

    renderer.writeEvent({
      kind: "loop_started",
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      intervalMs: 60_000,
      once: false
    });
    renderer.writeEvent({
      kind: "iteration_completed",
      iterationIndex: 54,
      result: idleResult
    });
    renderer.writeEvent({
      kind: "candidate_selected",
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      candidateIndex: 0,
      candidateCount: 1,
      dedupeKey: "dedupe-1"
    });

    expect(chunks.join("")).toContain(
      "\r\u001b[2Kplan watch: idle iterations=55 elapsed=55m candidates=0 deferred=0"
    );
    expect(chunks.join("")).toContain(
      "\nplan watch: candidate task=3-watch-loop"
    );
  });

  it("keeps overwritten idle progress within narrow TTY width", () => {
    const chunks: string[] = [];
    const renderer = new PlanWatchTerminalRenderer({
      isTty: true,
      columns: 40,
      color: false,
      write: (text) => {
        chunks.push(text);
      }
    });

    renderer.writeEvent({
      kind: "iteration_completed",
      iterationIndex: 75,
      result: {
        status: "idle",
        repoPath: "/repo",
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        scannedCandidateCount: 0,
        deferredCandidateCount: 3,
        diagnostics: [],
        onceExit: false
      }
    });

    const output = chunks.join("");
    const controlPrefix = "\r\u001b[2K";
    expect(output).toBe(`${controlPrefix}plan watch: idle i=76 t=1h16m c=0 d=3`);
    expect(output.length - controlPrefix.length).toBeLessThan(40);
  });

  it("returns blocked runner_config_missing through the command path", async () => {
    const triggerCandidate: LinkedBubbleTriggerCandidate = {
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      taskId: "3-watch-loop",
      taskPath: "plans/tasks/3-watch-loop.md",
      bubbleId: "3-watch-loop-impl",
      bubbleRole: "implementation",
      observedState: "READY_FOR_HUMAN_APPROVAL",
      observedAt: "2026-05-01T09:00:00.000Z",
      statusRef: "bubble:3-watch-loop-impl:round:2"
    };
    const dependencies: PlanWatchLoopDependencies = {
      resolveLinkedBubbleTriggerIndex: vi.fn(async () => ({
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        linkedBubbles: [],
        diagnostics: [],
        candidates: [triggerCandidate]
      })),
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: []
        })),
        reserveRun: vi.fn(async () => {}),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      },
      runExecutePairflowPlanContinuation: vi.fn(async (): Promise<AgentRunnerBridgeResult> => ({
        status: "settled_checkpoint",
        invocationId: "unused",
        startedAt: "2026-05-01T10:00:00.000Z",
        completedAt: "2026-05-01T10:00:01.000Z",
        reasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_SETTLED"),
        command: null
      })),
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      generateInvocationId: () => "invocation-1"
    };

    const result = await runPlanWatchCommand(
      ["plans/local-plan-watch-plan-v1.md", "--repo", "/repo", "--once"],
      "/cwd",
      () => dependencies
    );

    expect(result?.status).toBe("blocked");
    expect(result?.blockedReasonKind).toBe("runner_config_missing");
    expect(result?.runnerResult?.failureStage).toBe("precondition");
    expect(result?.runnerResult?.reasonCode).toBe(
      "PLAN_WATCH_RUNNER_CONFIG_MISSING"
    );
    expect(dependencies.ledger.reserveRun).not.toHaveBeenCalled();
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("forwards progress events through the command path", async () => {
    const triggerCandidate: LinkedBubbleTriggerCandidate = {
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      taskId: "3-watch-loop",
      taskPath: "plans/tasks/3-watch-loop.md",
      bubbleId: "3-watch-loop-impl",
      bubbleRole: "implementation",
      observedState: "READY_FOR_HUMAN_APPROVAL",
      observedAt: "2026-05-01T09:00:00.000Z",
      statusRef: "bubble:3-watch-loop-impl:round:2"
    };
    const dependencies: PlanWatchLoopDependencies = {
      resolveLinkedBubbleTriggerIndex: vi.fn(async () => ({
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        linkedBubbles: [],
        diagnostics: [],
        candidates: [triggerCandidate]
      })),
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: []
        })),
        reserveRun: vi.fn(async () => {}),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      },
      runExecutePairflowPlanContinuation: vi.fn(async (): Promise<AgentRunnerBridgeResult> => ({
        status: "settled_checkpoint",
        invocationId: "invocation-1",
        startedAt: "2026-05-01T10:00:00.000Z",
        completedAt: "2026-05-01T10:00:01.000Z",
        reasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_SETTLED"),
        command: null
      })),
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      generateInvocationId: () => "invocation-1"
    };
    const events: string[] = [];

    const result = await runPlanWatchCommand(
      [
        "plans/local-plan-watch-plan-v1.md",
        "--repo",
        "/repo",
        "--once",
        "--runner-command",
        "agent"
      ],
      "/cwd",
      () => dependencies,
      (event) => {
        events.push(event.kind);
      }
    );

    expect(result?.status).toBe("runner_settled_checkpoint");
    expect(events).toEqual([
      "loop_started",
      "candidate_selected",
      "runner_started",
      "runner_completed",
      "iteration_completed",
      "loop_stopped"
    ]);
  });

  it("passes the default idle timeout into legacy runner invocation config", async () => {
    const dependencies: PlanWatchLoopDependencies = {
      resolveLinkedBubbleTriggerIndex: vi.fn(async () => ({
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        linkedBubbles: [],
        diagnostics: [],
        candidates: []
      })),
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: []
        })),
        reserveRun: vi.fn(async () => {}),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      },
      runExecutePairflowPlanContinuation: vi.fn(async (): Promise<AgentRunnerBridgeResult> => ({
        status: "settled_checkpoint",
        invocationId: "invocation-1",
        startedAt: "2026-05-01T10:00:00.000Z",
        completedAt: "2026-05-01T10:00:01.000Z",
        reasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_SETTLED"),
        command: null
      })),
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      generateInvocationId: () => "invocation-1"
    };

    await runPlanWatchCommand(
      [
        "plans/local-plan-watch-plan-v1.md",
        "--repo",
        "/repo",
        "--once",
        "--run-now",
        "--runner-command",
        "agent"
      ],
      "/cwd",
      () => dependencies
    );

    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idleTimeoutMs: 15 * 60 * 1000 })
    );
  });

  it("passes configured plan-watch runner idle timeout into runner invocation config", async () => {
    const repoPath = await createTempDir();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[plan_watch.runner]\nbackend = "codex"\nidle_timeout_seconds = 42\n',
      "utf8"
    );
    const dependencies: PlanWatchLoopDependencies = {
      resolveLinkedBubbleTriggerIndex: vi.fn(async () => ({
        planPath: join(repoPath, "plans/local-plan-watch-plan-v1.md"),
        linkedBubbles: [],
        diagnostics: [],
        candidates: []
      })),
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: []
        })),
        reserveRun: vi.fn(async () => {}),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      },
      runExecutePairflowPlanContinuation: vi.fn(async (): Promise<AgentRunnerBridgeResult> => ({
        status: "settled_checkpoint",
        invocationId: "invocation-1",
        startedAt: "2026-05-01T10:00:00.000Z",
        completedAt: "2026-05-01T10:00:01.000Z",
        reasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_SETTLED"),
        command: null
      })),
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      generateInvocationId: () => "invocation-1"
    };

    await runPlanWatchCommand(
      [
        "plans/local-plan-watch-plan-v1.md",
        "--repo",
        repoPath,
        "--once",
        "--run-now"
      ],
      "/cwd",
      () => dependencies
    );

    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        backend: "codex",
        idleTimeoutMs: 42_000
      })
    );
  });

  it("rejects legacy runner args when a config-selected backend would ignore them", async () => {
    const repoPath = await createTempDir();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[plan_watch.runner]\nbackend = "codex"\n',
      "utf8"
    );

    await expect(
      runPlanWatchCommand(
        [
          "plans/local-plan-watch-plan-v1.md",
          "--repo",
          repoPath,
          "--once",
          "--runner-arg",
          "legacy-arg"
        ],
        "/cwd",
        () => {
          throw new Error("createDependencies should not be called");
        }
      )
    ).rejects.toThrow("PLAN_WATCH_RUNNER_ARG_UNSUPPORTED");
  });

  it("rejects legacy runner command when a config-selected backend is present", async () => {
    const repoPath = await createTempDir();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[plan_watch.runner]\nbackend = "codex"\n',
      "utf8"
    );

    await expect(
      runPlanWatchCommand(
        [
          "plans/local-plan-watch-plan-v1.md",
          "--repo",
          repoPath,
          "--once",
          "--runner-command",
          "legacy-runner"
        ],
        "/cwd",
        () => {
          throw new Error("createDependencies should not be called");
        }
      )
    ).rejects.toThrow("PLAN_WATCH_RUNNER_COMMAND_UNSUPPORTED");
  });

  it("rejects legacy runner input mode when a config-selected backend is present", async () => {
    const repoPath = await createTempDir();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[plan_watch.runner]\nbackend = "codex"\n',
      "utf8"
    );

    await expect(
      runPlanWatchCommand(
        [
          "plans/local-plan-watch-plan-v1.md",
          "--repo",
          repoPath,
          "--once",
          "--runner-input-mode",
          "arg_json"
        ],
        "/cwd",
        () => {
          throw new Error("createDependencies should not be called");
        }
      )
    ).rejects.toThrow("PLAN_WATCH_RUNNER_INPUT_MODE_UNSUPPORTED");
  });

  it("rejects explicit default runner input mode when a config-selected backend is present", async () => {
    const repoPath = await createTempDir();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[plan_watch.runner]\nbackend = "codex"\n',
      "utf8"
    );

    await expect(
      runPlanWatchCommand(
        [
          "plans/local-plan-watch-plan-v1.md",
          "--repo",
          repoPath,
          "--once",
          "--runner-input-mode",
          "stdin_json"
        ],
        "/cwd",
        () => {
          throw new Error("createDependencies should not be called");
        }
      )
    ).rejects.toThrow("PLAN_WATCH_RUNNER_INPUT_MODE_UNSUPPORTED");
  });

  it("documents the plan watch command surface", () => {
    expect(getPlanWatchHelpText()).toContain("pairflow plan watch <plan-path>");
    expect(getPlanWatchHelpText()).toContain("--run-now");
    expect(getPlanWatchHelpText()).toContain("--follow-runner");
    expect(getPlanWatchHelpText()).toContain("--runner-command");
  });
});
