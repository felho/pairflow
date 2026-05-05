import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  validatePlanWatchLedgerData
} from "../../../../src/v11/application/planWatch/planWatchLedger.js";
import {
  runPlanWatchIteration,
  runPlanWatchLoop
} from "../../../../src/v11/application/planWatch/planWatchLoop.js";
import {
  buildPlanWatchDedupeKey,
  buildPlanWatchRunNowDedupeKey
} from "../../../../src/v11/application/planWatch/planWatchLoopMapping.js";
import {
  createFilePlanWatchLedgerPort
} from "../../../../src/v11/defaults/planWatch/planWatchLoopDefaults.js";
import {
  PLAN_WATCH_LEDGER_SCHEMA_VERSION,
  PlanWatchLedgerError,
  type PlanWatchLedgerData,
  type PlanWatchLedgerPort,
  type PlanWatchLedgerRecord
} from "../../../../src/v11/application/planWatch/planWatchLedgerContract.js";
import {
  asAgentRunnerBridgeRunnerReasonCode,
  type AgentRunnerBridgeResult
} from "../../../../src/v11/application/planWatch/agentRunnerBridgeContract.js";
import type {
  LinkedBubbleTriggerCandidate,
  LinkedBubbleTriggerIndexResult
} from "../../../../src/v11/application/planWatch/linkedBubbleTriggerIndexContract.js";
import type {
  PlanWatchEvent,
  PlanWatchLoopDependencies
} from "../../../../src/v11/application/planWatch/planWatchLoopContract.js";

function candidate(
  overrides: Partial<LinkedBubbleTriggerCandidate> = {}
): LinkedBubbleTriggerCandidate {
  return {
    planPath: "/repo/plans/local-plan-watch-plan-v1.md",
    taskId: "3-watch-loop",
    taskPath: "plans/tasks/3-watch-loop.md",
    bubbleId: "3-watch-loop-impl",
    bubbleRole: "implementation",
    observedState: "READY_FOR_HUMAN_APPROVAL",
    observedAt: "2026-05-01T09:00:00.000Z",
    statusRef: "bubble:3-watch-loop-impl:round:2",
    statusMetadata: { round: 2 },
    ...overrides
  };
}

function indexResult(
  candidates: readonly LinkedBubbleTriggerCandidate[]
): LinkedBubbleTriggerIndexResult {
  return {
    planPath: "/repo/plans/local-plan-watch-plan-v1.md",
    candidates,
    linkedBubbles: [],
    diagnostics: []
  };
}

function runnerResult(
  overrides: Partial<AgentRunnerBridgeResult> = {}
): AgentRunnerBridgeResult {
  return {
    status: "settled_checkpoint",
    invocationId: "invocation-1",
    startedAt: "2026-05-01T10:00:00.000Z",
    completedAt: "2026-05-01T10:00:01.000Z",
    reasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_SETTLED"),
    command: null,
    ...overrides
  };
}

function memoryLedger(
  initial: readonly PlanWatchLedgerRecord[] = []
): PlanWatchLedgerPort & { records: PlanWatchLedgerRecord[] } {
  const state = {
    records: [...initial]
  };
  return {
    records: state.records,
    async read(): Promise<PlanWatchLedgerData> {
      return {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        records: state.records
      };
    },
    async reserveRun(record): Promise<void> {
      state.records.push(record);
    },
    async completeRun(record): Promise<void> {
      const index = state.records.findIndex(
        (existing) =>
          existing.key === record.key
          && existing.invocationId === record.invocationId
          && existing.recordState === "reserved"
      );
      if (index < 0) {
        throw new PlanWatchLedgerError(
          "ledger_write_failed",
          "reserved record missing"
        );
      }
      state.records[index] = record;
    },
    async observeDryRun(record): Promise<PlanWatchLedgerRecord> {
      if (state.records.some((existing) => existing.key === record.key && existing.mode === "run")) {
        throw new PlanWatchLedgerError(
          "ledger_write_failed",
          "dry-run record conflicts with run record"
        );
      }
      const existingDryRunRecord = state.records.find(
        (existing) => existing.key === record.key && existing.mode === "dry_run"
      );
      if (existingDryRunRecord !== undefined) {
        return existingDryRunRecord;
      }
      state.records.push(record);
      return record;
    }
  };
}

function deps(input: {
  candidates?: readonly LinkedBubbleTriggerCandidate[];
  ledger?: PlanWatchLedgerPort;
  runner?: AgentRunnerBridgeResult;
  now?: Date;
} = {}): PlanWatchLoopDependencies {
  return {
    resolveLinkedBubbleTriggerIndex: vi.fn(async () =>
      indexResult(input.candidates ?? [])
    ),
    ledger: input.ledger ?? memoryLedger(),
    runExecutePairflowPlanContinuation: vi.fn(async () =>
      input.runner ?? runnerResult()
    ),
    now: () => input.now ?? new Date("2026-05-01T10:00:00.000Z"),
    sleep: vi.fn(async () => {}),
    generateInvocationId: () => "invocation-1"
  };
}

describe("planWatchLoop", () => {
  it("returns idle without invoking the runner when no candidate exists", async () => {
    const dependencies = deps();

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("idle");
    expect(result.selectedCandidate).toBeUndefined();
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("invokes the runner for an explicit run-now continuation when no candidate exists", async () => {
    const ledger = memoryLedger();
    const dependencies = deps({ ledger });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runNow: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(result.selectedCandidate).toBeUndefined();
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(
      vi.mocked(dependencies.runExecutePairflowPlanContinuation).mock.calls[0]?.[0]
        .trigger
    ).toMatchObject({
      source: "plan_watch",
      reason: "operator_run_now"
    });
    expect(ledger.records).toHaveLength(1);
    expect(ledger.records[0]).toMatchObject({
      mode: "run",
      recordState: "completed",
      triggerEvidence: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        triggerKind: "operator_run_now"
      }
    });
    expect(JSON.stringify(ledger.records[0])).not.toContain("plan-watch-run-now");
  });

  it("dedupes repeated explicit run-now continuations for the same plan evidence", async () => {
    const ledger = memoryLedger();
    const dependencies = deps({ ledger });
    const input = {
      repoPath: "/repo",
      planPath: "plans/local-plan-watch-plan-v1.md",
      once: true,
      runNow: true,
      runnerConfig: { command: "agent" }
    };

    const first = await runPlanWatchIteration(input, dependencies);
    const second = await runPlanWatchIteration(input, dependencies);

    expect(first.status).toBe("runner_settled_checkpoint");
    expect(second.status).toBe("duplicate_skipped");
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(ledger.records).toHaveLength(1);
  });

  it("force-runs repeated explicit run-now continuations with distinct ledger evidence", async () => {
    const ledger = memoryLedger();
    const dependencies = deps({ ledger });
    const secondDependencies = deps({
      ledger,
      now: new Date("2026-05-01T10:00:01.000Z")
    });
    const input = {
      repoPath: "/repo",
      planPath: "plans/local-plan-watch-plan-v1.md",
      once: true,
      runNow: true,
      forceRun: true,
      runnerConfig: { command: "agent" }
    };

    const first = await runPlanWatchIteration(input, dependencies);
    const second = await runPlanWatchIteration(input, secondDependencies);

    expect(first.status).toBe("runner_settled_checkpoint");
    expect(second.status).toBe("runner_settled_checkpoint");
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(
      secondDependencies.runExecutePairflowPlanContinuation
    ).toHaveBeenCalledOnce();
    expect(ledger.records).toHaveLength(2);
    expect(ledger.records[0]?.key).not.toBe(ledger.records[1]?.key);
    expect(ledger.records[1]?.key).toContain("run-now-force:");
    expect(ledger.records[1]?.triggerEvidence).toMatchObject({
      triggerKind: "operator_run_now",
      forceRun: true
    });
  });

  it("uses run-now force only once inside a long-running watch loop", async () => {
    const ledger = memoryLedger();
    const sleep = vi.fn(async () => {});
    const dependencies = deps({ ledger });
    dependencies.sleep = sleep;

    const result = await runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        intervalMs: 25,
        maxIterations: 2,
        runNow: true,
        forceRun: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.iterations.map((iteration) => iteration.status)).toEqual([
      "runner_settled_checkpoint",
      "idle"
    ]);
    expect(result.stopReason).toBe("max_iterations");
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(ledger.records).toHaveLength(1);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("reserves, invokes, and completes a new approval-ready trigger", async () => {
    const ledger = memoryLedger();
    const dependencies = deps({
      candidates: [candidate()],
      ledger,
      runner: runnerResult({
        changedArtifacts: ["plans/tasks/3-watch-loop.md"],
        routeLedgerSummary: "settled",
        artifactDir:
          ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-plan_invocation-1",
        codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c"
      })
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(
      vi.mocked(dependencies.runExecutePairflowPlanContinuation).mock.calls[0]?.[0]
        .invocationId
    ).toBe("invocation-1");
    expect(ledger.records).toHaveLength(1);
    expect(ledger.records[0]).toMatchObject({
      mode: "run",
      recordState: "completed",
      invocationId: "invocation-1",
      runnerStatus: "settled_checkpoint",
      runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("PLAN_SETTLED"),
      changedArtifacts: ["plans/tasks/3-watch-loop.md"],
      routeLedgerSummary: "settled",
      artifactDir:
        ".pairflow/runtime/plan-watch/agent-runner/2026-05-01_10-00-00-plan_invocation-1",
      codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c"
    });
    expect(result.invocationId).toBe(ledger.records[0]?.invocationId);
  });

  it("skips duplicate completed run evidence without writing a second record", async () => {
    const key = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate()
    });
    const ledger = memoryLedger([
      {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key,
        mode: "run",
        recordState: "completed",
        invocationId: "old",
        triggerEvidence: {
          planPath: candidate().planPath,
          taskId: candidate().taskId,
          taskPath: candidate().taskPath,
          bubbleId: candidate().bubbleId,
          bubbleRole: candidate().bubbleRole,
          observedState: candidate().observedState
        },
        attemptedAt: "2026-05-01T09:00:00.000Z",
        completedAt: "2026-05-01T09:01:00.000Z",
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
      }
    ]);

    const dependencies = deps({ candidates: [candidate()], ledger });
    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("duplicate_skipped");
    expect(ledger.records).toHaveLength(1);
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("falls back to explicit run-now when all linked candidates are duplicate", async () => {
    const existingCandidate = candidate();
    const key = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: existingCandidate
    });
    const ledger = memoryLedger([
      {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key,
        mode: "run",
        recordState: "completed",
        invocationId: "old",
        triggerEvidence: {
          planPath: existingCandidate.planPath,
          taskId: existingCandidate.taskId,
          taskPath: existingCandidate.taskPath,
          bubbleId: existingCandidate.bubbleId,
          bubbleRole: existingCandidate.bubbleRole,
          observedState: existingCandidate.observedState
        },
        attemptedAt: "2026-05-01T09:00:00.000Z",
        completedAt: "2026-05-01T09:01:00.000Z",
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
      }
    ]);
    const dependencies = deps({ candidates: [existingCandidate], ledger });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runNow: true,
        forceRun: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(result.selectedCandidate).toBeUndefined();
    expect(result.dedupeKey).toBe(
      buildPlanWatchRunNowDedupeKey({
        repoPath: "/repo",
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        now: new Date("2026-05-01T10:00:00.000Z"),
        forceRun: true
      })
    );
    expect(
      vi.mocked(dependencies.runExecutePairflowPlanContinuation).mock.calls[0]?.[0]
        .trigger
    ).toMatchObject({
      source: "plan_watch",
      reason: "operator_run_now"
    });
    expect(ledger.records).toHaveLength(2);
    expect(ledger.records[1]?.triggerEvidence).toMatchObject({
      triggerKind: "operator_run_now",
      forceRun: true
    });
  });

  it("skips a completed duplicate and launches the next eligible candidate", async () => {
    const duplicateCandidate = candidate();
    const newCandidate = candidate({
      bubbleId: "4-pilot-docs-impl",
      taskId: "4-pilot-docs",
      taskPath: "plans/tasks/4-pilot-docs.md",
      statusRef: "bubble:4-pilot-docs-impl:round:1"
    });
    const duplicateKey = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: duplicateCandidate
    });
    const ledger = memoryLedger([
      {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key: duplicateKey,
        mode: "run",
        recordState: "completed",
        invocationId: "old",
        triggerEvidence: {
          planPath: duplicateCandidate.planPath,
          taskId: duplicateCandidate.taskId,
          taskPath: duplicateCandidate.taskPath,
          bubbleId: duplicateCandidate.bubbleId,
          bubbleRole: duplicateCandidate.bubbleRole,
          observedState: duplicateCandidate.observedState
        },
        attemptedAt: "2026-05-01T09:00:00.000Z",
        completedAt: "2026-05-01T09:01:00.000Z",
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
      }
    ]);
    const dependencies = deps({
      candidates: [duplicateCandidate, newCandidate],
      ledger
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(result.selectedCandidate?.bubbleId).toBe(newCandidate.bubbleId);
    expect(result.scannedCandidateCount).toBe(2);
    expect(result.deferredCandidateCount).toBe(0);
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(ledger.records).toHaveLength(2);
    expect(ledger.records[1]).toMatchObject({
      key: buildPlanWatchDedupeKey({
        repoPath: "/repo",
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        candidate: newCandidate
      }),
      mode: "run",
      recordState: "completed",
      triggerEvidence: {
        bubbleId: newCandidate.bubbleId,
        taskId: newCandidate.taskId
      }
    });
  });

  it("launches only the first candidate when multiple new candidates are eligible", async () => {
    const firstCandidate = candidate();
    const secondCandidate = candidate({
      bubbleId: "4-pilot-docs-impl",
      taskId: "4-pilot-docs",
      taskPath: "plans/tasks/4-pilot-docs.md",
      statusRef: "bubble:4-pilot-docs-impl:round:1"
    });
    const ledger = memoryLedger();
    const dependencies = deps({
      candidates: [firstCandidate, secondCandidate],
      ledger
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(result.selectedCandidate?.bubbleId).toBe(firstCandidate.bubbleId);
    expect(result.scannedCandidateCount).toBe(2);
    expect(result.deferredCandidateCount).toBe(1);
    expect(dependencies.runExecutePairflowPlanContinuation).toHaveBeenCalledOnce();
    expect(ledger.records).toHaveLength(1);
    expect(ledger.records[0]?.triggerEvidence).toMatchObject({
      bubbleId: firstCandidate.bubbleId
    });
  });

  it("records dry-run observations without consuming a later real run", async () => {
    const ledger = memoryLedger();
    const dryRunDependencies = deps({ candidates: [candidate()], ledger });

    const dryRun = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        dryRun: true
      },
      dryRunDependencies
    );

    const runDependencies = deps({ candidates: [candidate()], ledger });
    const realRun = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      runDependencies
    );

    expect(dryRun.status).toBe("dry_run");
    expect(dryRunDependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
    expect(realRun.status).toBe("runner_settled_checkpoint");
    expect(ledger.records.map((record) => record.mode)).toEqual(["dry_run", "run"]);
  });

  it("returns the persisted dry-run record for repeat observations", async () => {
    const ledger = memoryLedger();
    let invocationCount = 0;
    const dependencies = deps({ candidates: [candidate()], ledger });
    dependencies.generateInvocationId = () => {
      invocationCount += 1;
      return `invocation-${invocationCount}`;
    };

    const first = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        dryRun: true
      },
      dependencies
    );
    const second = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        dryRun: true
      },
      dependencies
    );

    expect(first.status).toBe("dry_run");
    expect(second.status).toBe("dry_run");
    expect(ledger.records).toHaveLength(1);
    expect(second.invocationId).toBe(first.invocationId);
    expect(second.ledgerRecord).toEqual(first.ledgerRecord);
  });

  it("blocks an interrupted reserved run instead of reinvoking", async () => {
    const key = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate()
    });
    const ledger = memoryLedger([
      {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key,
        mode: "run",
        recordState: "reserved",
        invocationId: "old",
        triggerEvidence: {
          planPath: candidate().planPath,
          taskId: candidate().taskId,
          taskPath: candidate().taskPath,
          bubbleId: candidate().bubbleId,
          bubbleRole: candidate().bubbleRole,
          observedState: candidate().observedState
        },
        attemptedAt: "2026-05-01T09:00:00.000Z"
      }
    ]);

    const dependencies = deps({ candidates: [candidate()], ledger });
    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("interrupted_attempt_exists");
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("blocks missing runner config before ledger reservation or runner invocation", async () => {
    const ledger = memoryLedger();
    const dependencies = deps({ candidates: [candidate()], ledger });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("runner_config_missing");
    expect(result.invocationId).toBe("invocation-1");
    expect(result.runnerResult).toMatchObject({
      status: "blocked",
      reasonCode: "PLAN_WATCH_RUNNER_CONFIG_MISSING",
      failureStage: "precondition",
      command: null
    });
    expect(ledger.records).toEqual([]);
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("maps runner trigger context without candidate or lifecycle authority fields", async () => {
    const dependencies = deps({ candidates: [candidate()] });
    await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    const call = vi.mocked(dependencies.runExecutePairflowPlanContinuation).mock
      .calls[0];
    expect(call?.[0].trigger).toMatchObject({
      source: "plan_watch",
      reason: "linked_bubble_approval_ready",
      observedAt: "2026-05-01T09:00:00.000Z"
    });
    expect(call?.[0].trigger.refs).toBeUndefined();
    expect(call?.[0].trigger.metadata).toBeUndefined();
    expect(JSON.stringify(call?.[0].trigger)).not.toContain("3-watch-loop");
    expect(JSON.stringify(call?.[0].trigger)).not.toContain("READY_FOR_HUMAN_APPROVAL");
    expect(JSON.stringify(call?.[0].trigger)).not.toContain("route_class");
    expect(JSON.stringify(call?.[0].trigger)).not.toContain("approve");
  });

  it("uses iteration clock for runner trigger observedAt when candidate observedAt is absent", async () => {
    const dependencies = deps({
      candidates: [candidate({ observedAt: undefined })]
    });

    await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    const call = vi.mocked(dependencies.runExecutePairflowPlanContinuation).mock
      .calls[0];
    expect(call?.[0].trigger.observedAt).toBe("2026-05-01T10:00:00.000Z");
  });

  it("uses no-status-ref in the dedupe key when status ref and observedAt are absent", () => {
    const key = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate({ observedAt: undefined, statusRef: undefined })
    });

    expect(key).toContain("status=no-status-ref");
  });

  it("uses the same no-status-ref dedupe key for repeated observations without status evidence", () => {
    const first = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate({
        observedAt: undefined,
        statusRef: undefined,
        statusMetadata: { round: 2 }
      })
    });
    const second = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate({
        observedAt: undefined,
        statusRef: undefined,
        statusMetadata: { round: 3 }
      })
    });

    expect(first).toBe(second);
    expect(first).toContain("status=no-status-ref");
  });

  it("uses candidate observedAt in dedupe key when statusRef is absent", () => {
    const key = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate({ statusRef: undefined })
    });

    expect(key).toContain("status=2026-05-01T09:00:00.000Z");
  });

  it("blocks ledger_unreadable without invoking runner or selecting candidate", async () => {
    const dependencies = deps({
      candidates: [candidate()],
      ledger: {
        read: vi.fn(async () => {
          throw new PlanWatchLedgerError(
            "ledger_unreadable",
            "PLAN_WATCH_LEDGER_UNREADABLE: corrupt test ledger. context: path=/repo/.pairflow/runtime/plan-watch/ledger.json"
          );
        }),
        reserveRun: vi.fn(async () => {}),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      }
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("ledger_unreadable");
    expect(result.selectedCandidate).toBeUndefined();
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("blocks unsupported ledger schema without invoking runner or selecting candidate", async () => {
    const dependencies = deps({
      candidates: [candidate()],
      ledger: {
        read: vi.fn(async () => {
          throw new PlanWatchLedgerError(
            "ledger_schema_unsupported",
            "Unsupported plan watch ledger schema version."
          );
        }),
        reserveRun: vi.fn(async () => {}),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      }
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("ledger_schema_unsupported");
    expect(result.selectedCandidate).toBeUndefined();
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("omits selectedCandidate for precondition failures before candidate selection", async () => {
    const dependencies = deps({ candidates: [candidate()] });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("precondition_failed");
    expect(result.selectedCandidate).toBeUndefined();
    expect(dependencies.resolveLinkedBubbleTriggerIndex).not.toHaveBeenCalled();
  });

  it("blocks unresolved reserve contention with a dedicated reason", async () => {
    const dependencies = deps({
      candidates: [candidate()],
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: []
        })),
        reserveRun: vi.fn(async () => {
          throw new PlanWatchLedgerError(
            "ledger_write_failed",
            "PLAN_WATCH_RUN_RECORD_CONTENTION: duplicate run record. context: key=test"
          );
        }),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      }
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("reservation_contention_unresolved");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "RESERVATION_CONTENTION_UNRESOLVED"
    );
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("re-reads ledger contention as interrupted attempt instead of transient write failure", async () => {
    const key = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate()
    });
    const reservedRecord: PlanWatchLedgerRecord = {
      schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
      key,
      mode: "run",
      recordState: "reserved",
      invocationId: "other-watch",
      triggerEvidence: {
        planPath: candidate().planPath,
        taskId: candidate().taskId,
        taskPath: candidate().taskPath,
        bubbleId: candidate().bubbleId,
        bubbleRole: candidate().bubbleRole,
        observedState: candidate().observedState
      },
      attemptedAt: "2026-05-01T09:59:00.000Z"
    };
    const dependencies = deps({
      candidates: [candidate()],
      ledger: {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
            records: []
          })
          .mockResolvedValueOnce({
            schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
            records: [reservedRecord]
          }),
        reserveRun: vi.fn(async () => {
          throw new PlanWatchLedgerError(
            "ledger_write_failed",
            "PLAN_WATCH_RUN_RECORD_CONTENTION: duplicate run record. context: key=test"
          );
        }),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      }
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("interrupted_attempt_exists");
    expect(dependencies.runExecutePairflowPlanContinuation).not.toHaveBeenCalled();
  });

  it("honors configured interval and forwards stop signal to sleep", async () => {
    const controller = new AbortController();
    const sleep = vi.fn(async () => {});
    const dependencies = deps({
      candidates: [candidate()],
      runner: runnerResult({
        status: "settled_checkpoint"
      })
    });
    dependencies.sleep = sleep;

    const result = await runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        maxIterations: 2,
        intervalMs: 25,
        runnerConfig: { command: "agent" },
        stopSignal: controller.signal
      },
      dependencies
    );

    expect(result.iterations).toHaveLength(2);
    expect(result.stopReason).toBe("max_iterations");
    expect(sleep).toHaveBeenCalledWith(25, controller.signal);
  });

  it("continues the loop after transient unresolved reservation contention", async () => {
    const sleep = vi.fn(async () => {});
    const dependencies = deps({
      candidates: [candidate()],
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: []
        })),
        reserveRun: vi.fn(async () => {
          throw new PlanWatchLedgerError(
            "ledger_write_failed",
            "PLAN_WATCH_RUN_RECORD_CONTENTION: duplicate run record. context: key=test"
          );
        }),
        completeRun: vi.fn(async () => {}),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      }
    });
    dependencies.sleep = sleep;

    const result = await runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        intervalMs: 25,
        maxIterations: 2,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.iterations).toHaveLength(2);
    expect(result.iterations.map((iteration) => iteration.blockedReasonKind)).toEqual([
      "reservation_contention_unresolved",
      "reservation_contention_unresolved"
    ]);
    expect(result.stopReason).toBe("max_iterations");
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("stops after a human checkpoint without --once", async () => {
    const sleep = vi.fn(async () => {});
    const dependencies = deps({
      candidates: [candidate()],
      runner: runnerResult({ status: "human_checkpoint" })
    });
    dependencies.sleep = sleep;

    const result = await runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        maxIterations: 3,
        intervalMs: 25,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("runner_human_checkpoint");
    expect(result.iterations).toHaveLength(1);
    expect(result.stopReason).toBe("condition");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("emits progress events around candidate execution", async () => {
    const events: string[] = [];
    const dependencies = deps({
      candidates: [candidate()],
      runner: runnerResult({ status: "settled_checkpoint" })
    });

    const result = await runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        intervalMs: 25,
        runnerConfig: { command: "agent" },
        onEvent: (event) => {
          events.push(event.kind);
        }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(events).toEqual([
      "loop_started",
      "candidate_selected",
      "runner_started",
      "runner_completed",
      "iteration_completed",
      "loop_stopped"
    ]);
  });

  it("keeps the reserved ledger record shape when completion write fails", async () => {
    const reservedRecords: PlanWatchLedgerRecord[] = [];
    const dependencies = deps({
      candidates: [candidate()],
      ledger: {
        read: vi.fn(async (): Promise<PlanWatchLedgerData> => ({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: reservedRecords
        })),
        reserveRun: vi.fn(async (record: PlanWatchLedgerRecord) => {
          reservedRecords.push(record);
        }),
        completeRun: vi.fn(async () => {
          throw new PlanWatchLedgerError(
            "ledger_write_failed",
            "completion write failed"
          );
        }),
        observeDryRun: vi.fn(async (record: PlanWatchLedgerRecord) => record)
      }
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("ledger_write_failed");
    expect(result.ledgerRecord).toMatchObject({
      mode: "run",
      recordState: "reserved",
      invocationId: "invocation-1"
    });
    expect(result.ledgerRecord).not.toHaveProperty("completedAt");
    expect(reservedRecords).toHaveLength(1);
  });

  it("returns promptly when the stop signal aborts during sleep", async () => {
    const controller = new AbortController();
    const dependencies = deps({
      candidates: [candidate()],
      runner: runnerResult({ status: "settled_checkpoint" })
    });
    delete dependencies.sleep;

    const loop = runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        intervalMs: 60_000,
        runnerConfig: { command: "agent" },
        stopSignal: controller.signal
      },
      dependencies
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await loop;

    expect(result.stopped).toBe(true);
    expect(result.stopReason).toBe("signal");
    expect(result.iterations).toHaveLength(1);
  });

  it("removes default sleep abort listeners after each resolved interval", async () => {
    const controller = new AbortController();
    const addListener = vi.spyOn(controller.signal, "addEventListener");
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const dependencies = deps({
      candidates: [candidate()],
      runner: runnerResult({ status: "settled_checkpoint" })
    });
    delete dependencies.sleep;

    const result = await runPlanWatchLoop(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        maxIterations: 2,
        intervalMs: 1,
        runnerConfig: { command: "agent" },
        stopSignal: controller.signal
      },
      dependencies
    );

    expect(result.stopReason).toBe("max_iterations");
    expect(addListener).toHaveBeenCalledWith("abort", expect.any(Function), {
      once: true
    });
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("sets onceExit for idle, duplicate, dry-run, human checkpoint, and blocked statuses", async () => {
    const duplicateKey = buildPlanWatchDedupeKey({
      repoPath: "/repo",
      planPath: "/repo/plans/local-plan-watch-plan-v1.md",
      candidate: candidate()
    });
    const completedRecord: PlanWatchLedgerRecord = {
      schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
      key: duplicateKey,
      mode: "run",
      recordState: "completed",
      invocationId: "old",
      triggerEvidence: {
        planPath: candidate().planPath,
        taskId: candidate().taskId,
        taskPath: candidate().taskPath,
        bubbleId: candidate().bubbleId,
        bubbleRole: candidate().bubbleRole,
        observedState: candidate().observedState
      },
      attemptedAt: "2026-05-01T09:00:00.000Z",
      completedAt: "2026-05-01T09:01:00.000Z",
      runnerStatus: "settled_checkpoint",
      runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
    };

    const cases = [
      runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true,
          runnerConfig: { command: "agent" }
        },
        deps()
      ),
      runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true,
          runnerConfig: { command: "agent" }
        },
        deps({ candidates: [candidate()], ledger: memoryLedger([completedRecord]) })
      ),
      runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true,
          dryRun: true
        },
        deps({ candidates: [candidate()] })
      ),
      runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true,
          runnerConfig: { command: "agent" }
        },
        deps({
          candidates: [candidate()],
          runner: runnerResult({ status: "human_checkpoint" })
        })
      ),
      runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true
        },
        deps({ candidates: [candidate()] })
      )
    ];

    const results = await Promise.all(cases);

    expect(results.map((result) => result.status)).toEqual([
      "idle",
      "duplicate_skipped",
      "dry_run",
      "runner_human_checkpoint",
      "blocked"
    ]);
    expect(results.every((result) => result.onceExit)).toBe(true);
  });

  it("maps runner bridge blocked outcomes to watch blocked discriminators", async () => {
    const dependencies = deps({
      candidates: [candidate()],
      runner: runnerResult({
        status: "blocked",
        reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
        failureStage: "output"
      })
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("runner_output_invalid");
  });

  it("maps spawn, timeout, and non-zero runner failures to runner_execution_failed", async () => {
    for (const failureStage of ["spawn", "timeout", "exit", "abort"] as const) {
      const dependencies = deps({
        candidates: [candidate()],
        runner: runnerResult({
          status: "blocked",
          reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
          failureStage
        })
      });

      const result = await runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true,
          runnerConfig: { command: "agent" }
        },
        dependencies
      );

      expect(result.status).toBe("blocked");
      expect(result.blockedReasonKind).toBe("runner_execution_failed");
    }
  });

  it("completes the reserved record when the runner dependency throws", async () => {
    const ledger = memoryLedger();
    const dependencies = deps({ candidates: [candidate()], ledger });
    dependencies.runExecutePairflowPlanContinuation = vi.fn(async () => {
      throw new Error("runner crashed");
    });

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" }
      },
      dependencies
    );

    expect(result.status).toBe("blocked");
    expect(result.blockedReasonKind).toBe("runner_execution_failed");
    expect(result.runnerResult).toMatchObject({
      status: "blocked",
      reasonCode: "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      stderr: "runner crashed"
    });
    expect(ledger.records).toHaveLength(1);
    expect(ledger.records[0]).toMatchObject({
      mode: "run",
      recordState: "completed",
      invocationId: "invocation-1",
      runnerStatus: "blocked",
      runnerReasonCode: "AGENT_RUNNER_SPAWN_FAILED"
    });
  });

  it("forwards the stop signal into the runner input", async () => {
    const controller = new AbortController();
    const dependencies = deps({ candidates: [candidate()] });

    await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" },
        stopSignal: controller.signal
      },
      dependencies
    );

    const call = vi.mocked(dependencies.runExecutePairflowPlanContinuation).mock
      .calls[0];
    expect(call?.[0].stopSignal).toBe(controller.signal);
  });

  it("emits runner artifact readiness when the bridge reports Codex files", async () => {
    const triggerCandidate = candidate();
    const dependencies = deps({ candidates: [triggerCandidate] });
    vi.mocked(dependencies.runExecutePairflowPlanContinuation).mockImplementation(
      async (input) => {
        await input.onArtifactFiles?.({
          artifactDir: "/repo/.pairflow/runtime/plan-watch/agent-runner/run",
          artifactDirRef: ".pairflow/runtime/plan-watch/agent-runner/run",
          schemaFilePath:
            "/repo/.pairflow/runtime/plan-watch/agent-runner/run/schema.json",
          metadataFilePath:
            "/repo/.pairflow/runtime/plan-watch/agent-runner/run/metadata.json",
          eventsFilePath:
            "/repo/.pairflow/runtime/plan-watch/agent-runner/run/events.ndjson",
          timelineFilePath:
            "/repo/.pairflow/runtime/plan-watch/agent-runner/run/timeline.ndjson"
        });
        return runnerResult();
      }
    );
    const events: PlanWatchEvent["kind"][] = [];

    const result = await runPlanWatchIteration(
      {
        repoPath: "/repo",
        planPath: "plans/local-plan-watch-plan-v1.md",
        once: true,
        runnerConfig: { command: "agent" },
        onEvent: (event) => {
          events.push(event.kind);
        }
      },
      dependencies
    );

    expect(result.status).toBe("runner_settled_checkpoint");
    expect(events).toContain("runner_artifact_ready");
  });

  it("accepts the three legal ledger mode and recordState combinations", () => {
    const validBase = {
      schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
      key: "k",
      invocationId: "i",
      triggerEvidence: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      attemptedAt: "2026-05-01T09:00:00.000Z"
    };

    expect(() =>
      validatePlanWatchLedgerData({
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        records: [
          { ...validBase, mode: "run", recordState: "reserved" },
          {
            ...validBase,
            key: "k2",
            mode: "run",
            recordState: "completed",
            completedAt: "2026-05-01T09:01:00.000Z",
            runnerStatus: "settled_checkpoint",
            runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE"),
            codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c"
          },
          {
            ...validBase,
            key: "k3",
            mode: "dry_run",
            recordState: "dry_run_observed"
          }
        ]
      })
    ).not.toThrow();
  });

  it("rejects illegal ledger mode and recordState combinations", () => {
    const validBase = {
      schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
      key: "k",
      invocationId: "i",
      triggerEvidence: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      attemptedAt: "2026-05-01T09:00:00.000Z"
    };

    const invalidRecords = [
      { ...validBase, mode: "run", recordState: "dry_run_observed" },
      { ...validBase, mode: "dry_run", recordState: "reserved" },
      {
        ...validBase,
        mode: "dry_run",
        recordState: "completed",
        completedAt: "2026-05-01T09:01:00.000Z",
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
      }
    ];

    for (const record of invalidRecords) {
      expect(() =>
        validatePlanWatchLedgerData({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: [record]
        })
      ).toThrow(PlanWatchLedgerError);
    }
  });

  it("rejects completed run records with invalid runner outcome fields", () => {
    const validBase = {
      schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
      key: "k",
      invocationId: "i",
      triggerEvidence: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      attemptedAt: "2026-05-01T09:00:00.000Z",
      mode: "run",
      recordState: "completed",
      completedAt: "2026-05-01T09:01:00.000Z"
    };

    const invalidRecords = [
      {
        ...validBase,
        runnerStatus: "unknown",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
      },
      {
        ...validBase,
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: ""
      },
      {
        ...validBase,
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE"),
        changedArtifacts: ["plans/a.md", 42]
      },
      {
        ...validBase,
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE"),
        routeLedgerSummary: 42
      },
      {
        ...validBase,
        runnerStatus: "settled_checkpoint",
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE"),
        codexSessionId: 42
      }
    ];

    for (const record of invalidRecords) {
      expect(() =>
        validatePlanWatchLedgerData({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: [record]
        })
      ).toThrow(PlanWatchLedgerError);
    }
  });

  it("rejects ledger records missing mode with a mode diagnostic", () => {
    expect(() =>
      validatePlanWatchLedgerData({
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        records: [
          {
            schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
            key: "k",
            invocationId: "i",
            triggerEvidence: {
              planPath: "/repo/plans/local-plan-watch-plan-v1.md",
              taskId: "3-watch-loop",
              taskPath: "plans/tasks/3-watch-loop.md",
              bubbleId: "3-watch-loop-impl",
              bubbleRole: "implementation",
              observedState: "READY_FOR_HUMAN_APPROVAL"
            },
            attemptedAt: "2026-05-01T09:00:00.000Z",
            recordState: "reserved"
          }
        ]
      })
    ).toThrow(/mode=missing/u);
  });

  it("rejects a second completion for the same invocation without adding records", async () => {
    const key = "plan=plans/local-plan-watch-plan-v1.md|task=3-watch-loop|taskPath=plans/tasks/3-watch-loop.md|bubble=3-watch-loop-impl|role=implementation|state=READY_FOR_HUMAN_APPROVAL|status=ref";
    const ledger = memoryLedger([
      {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key,
        mode: "run",
        recordState: "reserved",
        invocationId: "invocation-1",
        triggerEvidence: {
          planPath: "/repo/plans/local-plan-watch-plan-v1.md",
          taskId: "3-watch-loop",
          taskPath: "plans/tasks/3-watch-loop.md",
          bubbleId: "3-watch-loop-impl",
          bubbleRole: "implementation",
          observedState: "READY_FOR_HUMAN_APPROVAL"
        },
        attemptedAt: "2026-05-01T09:00:00.000Z"
      }
    ]);
    const completedRecord: PlanWatchLedgerRecord = {
      ...ledger.records[0]!,
      recordState: "completed",
      completedAt: "2026-05-01T09:01:00.000Z",
      runnerStatus: "settled_checkpoint",
      runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
    };

    await ledger.completeRun(completedRecord);
    await expect(ledger.completeRun(completedRecord)).rejects.toMatchObject({
      reason: "ledger_write_failed"
    });

    expect(ledger.records).toHaveLength(1);
    expect(ledger.records[0]).toMatchObject({
      recordState: "completed",
      invocationId: "invocation-1"
    });
  });

  it("reads the file ledger through schema validation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "plan-watch-ledger-schema-"));
    try {
      const ledgerPath = join(tempDir, "ledger.json");
      await writeFile(
        ledgerPath,
        `${JSON.stringify({ schemaVersion: 99, records: [] })}\n`,
        "utf8"
      );
      const dependencies = deps({
        candidates: [candidate()],
        ledger: createFilePlanWatchLedgerPort(ledgerPath)
      });

      const result = await runPlanWatchIteration(
        {
          repoPath: "/repo",
          planPath: "plans/local-plan-watch-plan-v1.md",
          once: true,
          runnerConfig: { command: "agent" }
        },
        dependencies
      );

      expect(result.status).toBe("blocked");
      expect(result.blockedReasonKind).toBe("ledger_schema_unsupported");
      expect(result.selectedCandidate).toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("serializes file ledger reserve attempts so duplicate run records cannot be created", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "plan-watch-ledger-"));
    try {
      const ledgerPath = join(tempDir, "ledger.json");
      const port = createFilePlanWatchLedgerPort(ledgerPath);
      const key = "plan=plans/local-plan-watch-plan-v1.md|task=3-watch-loop|taskPath=plans/tasks/3-watch-loop.md|bubble=3-watch-loop-impl|role=implementation|state=READY_FOR_HUMAN_APPROVAL|status=ref";
      const baseRecord: PlanWatchLedgerRecord = {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key,
        mode: "run",
        recordState: "reserved",
        invocationId: "invocation-a",
        triggerEvidence: {
          planPath: "/repo/plans/local-plan-watch-plan-v1.md",
          taskId: "3-watch-loop",
          taskPath: "plans/tasks/3-watch-loop.md",
          bubbleId: "3-watch-loop-impl",
          bubbleRole: "implementation",
          observedState: "READY_FOR_HUMAN_APPROVAL"
        },
        attemptedAt: "2026-05-01T09:00:00.000Z"
      };
      const secondRecord = {
        ...baseRecord,
        invocationId: "invocation-b"
      };

      const results = await Promise.allSettled([
        port.reserveRun(baseRecord),
        port.reserveRun(secondRecord)
      ]);
      const content = JSON.parse(await readFile(ledgerPath, "utf8")) as PlanWatchLedgerData;

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(content.records.filter((record) => record.mode === "run")).toHaveLength(1);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects dry-run records carrying run-only optional fields", () => {
    const validBase = {
      schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
      key: "k",
      invocationId: "i",
      triggerEvidence: {
        planPath: "/repo/plans/local-plan-watch-plan-v1.md",
        taskId: "3-watch-loop",
        taskPath: "plans/tasks/3-watch-loop.md",
        bubbleId: "3-watch-loop-impl",
        bubbleRole: "implementation",
        observedState: "READY_FOR_HUMAN_APPROVAL"
      },
      attemptedAt: "2026-05-01T09:00:00.000Z",
      mode: "dry_run",
      recordState: "dry_run_observed"
    };

    const invalidRecords = [
      { ...validBase, artifactDir: ".pairflow/runtime/plan-watch/agent-runner/run" },
      { ...validBase, completedAt: "2026-05-01T09:01:00.000Z" },
      { ...validBase, runnerStatus: "settled_checkpoint" },
      {
        ...validBase,
        runnerReasonCode: asAgentRunnerBridgeRunnerReasonCode("DONE")
      },
      { ...validBase, changedArtifacts: ["plans/a.md"] },
      { ...validBase, routeLedgerSummary: "settled" },
      { ...validBase, codexSessionId: "019df063-d8b1-7631-9be8-191fe2eef27c" }
    ];

    for (const record of invalidRecords) {
      expect(() =>
        validatePlanWatchLedgerData({
          schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
          records: [record]
        })
      ).toThrow(PlanWatchLedgerError);
    }
  });

  it("keeps file ledger dry-run observations idempotent for the same key", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "plan-watch-ledger-dry-run-"));
    try {
      const ledgerPath = join(tempDir, "ledger.json");
      const port = createFilePlanWatchLedgerPort(ledgerPath);
      const record = {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key: "dry-run-key",
        mode: "dry_run",
        recordState: "dry_run_observed",
        invocationId: "dry-run-a",
        triggerEvidence: {
          planPath: "/repo/plans/local-plan-watch-plan-v1.md",
          taskId: "3-watch-loop",
          taskPath: "plans/tasks/3-watch-loop.md",
          bubbleId: "3-watch-loop-impl",
          bubbleRole: "implementation",
          observedState: "READY_FOR_HUMAN_APPROVAL"
        },
        attemptedAt: "2026-05-01T09:00:00.000Z"
      } satisfies PlanWatchLedgerRecord;

      await port.observeDryRun(record);
      await port.observeDryRun({ ...record, invocationId: "dry-run-b" });
      const content = JSON.parse(await readFile(ledgerPath, "utf8")) as PlanWatchLedgerData;

      expect(content.records.filter((entry) => entry.mode === "dry_run")).toHaveLength(1);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects file ledger dry-run observations after a run record exists for the same key", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "plan-watch-ledger-dry-run-run-"));
    try {
      const ledgerPath = join(tempDir, "ledger.json");
      const port = createFilePlanWatchLedgerPort(ledgerPath);
      const runRecord = {
        schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
        key: "mixed-mode-key",
        mode: "run",
        recordState: "reserved",
        invocationId: "run-a",
        triggerEvidence: {
          planPath: "/repo/plans/local-plan-watch-plan-v1.md",
          taskId: "3-watch-loop",
          taskPath: "plans/tasks/3-watch-loop.md",
          bubbleId: "3-watch-loop-impl",
          bubbleRole: "implementation",
          observedState: "READY_FOR_HUMAN_APPROVAL"
        },
        attemptedAt: "2026-05-01T09:00:00.000Z"
      } satisfies PlanWatchLedgerRecord;
      const dryRunRecord = {
        ...runRecord,
        mode: "dry_run",
        recordState: "dry_run_observed",
        invocationId: "dry-run-a"
      } satisfies PlanWatchLedgerRecord;

      await port.reserveRun(runRecord);
      await expect(port.observeDryRun(dryRunRecord)).rejects.toMatchObject({
        reason: "ledger_write_failed"
      });
      const content = JSON.parse(await readFile(ledgerPath, "utf8")) as PlanWatchLedgerData;

      expect(content.records).toHaveLength(1);
      expect(content.records[0]?.mode).toBe("run");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
