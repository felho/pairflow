import { describe, expect, it, vi } from "vitest";

import {
  getPlanWatchHelpText,
  parsePlanWatchCommandOptions,
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
    expect(dependencies.ledger.reserveRun).not.toHaveBeenCalled();
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("documents the plan watch command surface", () => {
    expect(getPlanWatchHelpText()).toContain("pairflow plan watch <plan-path>");
    expect(getPlanWatchHelpText()).toContain("--runner-command");
  });
});
