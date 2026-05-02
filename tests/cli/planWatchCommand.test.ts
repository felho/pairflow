import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPlanWatchHelpText,
  parsePlanWatchCommandOptions,
  renderPlanWatchEventText,
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
    expect(getPlanWatchHelpText()).toContain("--runner-command");
  });
});
