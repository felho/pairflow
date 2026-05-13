import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace } from "../../../src/v11/application/converged/convergedCommandOrchestration.js";
import { emitPassFromWorkspace } from "../../../src/v11/application/pass/passCommandOrchestration.js";
import { runAgentEmitCommand } from "../../../src/cli/commands/agent/emit.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { submitMetaReviewResult } from "../../../src/v11/defaults/metaReview/metaReviewApi.js";
import { applyMetaReviewGateOnConvergence } from "../../../src/v11/defaults/metaReviewGate/metaReviewGateApi.js";
import { startBubble } from "../../../src/v11/application/start/startCommandApi.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { normalizeBubbleReviewPolicy } from "../../../src/v11/shared/reviewPolicy/reviewPolicyRuntime.js";
import {
  readRuntimeSessionsRegistry,
  upsertRuntimeSession
} from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { reconcileRuntimeSessions as reconcileRuntimeSessionsApplication } from "../../../src/v11/application/reconcile/reconcileCommandApi.js";
import type {
  ReconcileRuntimeSessionsDependencies,
  ReconcileRuntimeSessionsInput
} from "../../../src/v11/application/reconcile/reconcileCommandContract.js";
import { reconcileRuntimeSessionsDefaultDependencies } from "../../../src/v11/defaults/reconcile/reconcileCommandDefaults.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/v11/domain/state/execution/executionContext.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { buildWorktreeBootstrapResult } from "../../helpers/worktreeBootstrapResult.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../helpers/stateSnapshot.js";
const tempDirs: string[] = [];
const reconcileRuntimeSessionsDefaults = {
  ...reconcileRuntimeSessionsDefaultDependencies,
  readStateSnapshot
};

function reconcileRuntimeSessions(
  input: ReconcileRuntimeSessionsInput = {},
  dependencies: ReconcileRuntimeSessionsDependencies = {}
) {
  return reconcileRuntimeSessionsApplication(input, {
    ...reconcileRuntimeSessionsDefaults,
    ...dependencies
  });
}

async function createTempRepo(prefix = "pairflow-restart-recovery-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("restart recovery", () => {
  it("reconciles stale runtime ownership then reattaches tmux from persisted RUNNING state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_restart_01",
      task: "Restart recovery task"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_restart_01",
      now: new Date("2026-02-23T10:00:00.000Z")
    });

    const reconciled = await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });
    expect(reconciled.staleCandidates).toBe(1);
    expect(reconciled.actions[0]?.reason).toBe("missing_tmux_session");
    expect(reconciled.sessionsAfter).toBe(0);

    let bootstrapCalled = false;
    const started = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T10:05:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () => {
          bootstrapCalled = true;
          return Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: bubble.config.bubble_branch,
              worktreePath: bubble.paths.worktreePath
            })
          );
        },
        launchBubbleSessionAck: () =>
          Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_01" })
      }
    );

    expect(bootstrapCalled).toBe(false);
    expect(started.state.state).toBe("RUNNING");
    expect(started.state.last_command_at).toBe("2026-02-23T10:05:00.000Z");

    const [state, registry] = await Promise.all([
      readStateSnapshot(bubble.paths.statePath),
      readRuntimeSessionsRegistry(bubble.paths.sessionsPath, { allowMissing: false })
    ]);
    expect(state.state.state).toBe("RUNNING");
    expect(registry[bubble.bubbleId]?.tmuxSessionName).toBe("pf-b_restart_01");
  });

  it("preserves RUNNING meta-review authority on restart and keeps worktree-local pairflow bootstrap active", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_restart_meta_01",
      task: "Restart recovery meta-review task"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const readyForApproval = toPersistedSnapshot(
      applyStateTransition(buildBubbleStateSnapshotVariant(loaded.state), {
        to: "READY_FOR_HUMAN_APPROVAL",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        lastCommandAt: "2026-02-23T11:00:00.000Z"
      })
    );
    const metaReviewRunning = {
      ...readyForApproval,
      state: "RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "meta_reviewer" as const,
      active_since: "2026-02-23T11:01:00.000Z",
      last_command_at: "2026-02-23T11:01:00.000Z",
      execution_context: metaReviewExecutionContextToRunningContext(
        buildMetaReviewExecutionContext({
          bubbleId: bubble.bubbleId,
          round: readyForApproval.round,
          startedAt: "2026-02-23T11:01:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      ),
      meta_review: {
        ...readyForApproval.meta_review!,
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: bubble.bubbleId,
          round: readyForApproval.round,
          startedAt: "2026-02-23T11:01:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      }
    };
    await writeStateSnapshot(bubble.paths.statePath, metaReviewRunning, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_restart_meta_01",
      now: new Date("2026-02-23T11:02:00.000Z")
    });

    const reconciled = await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });
    expect(reconciled.actions[0]?.reason).toBe("missing_tmux_session");

    let launchInput:
      | {
          implementerCommand: string;
          reviewerCommand: string;
          metaReviewerKickoffMessage?: string;
        }
      | undefined;
    const started = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T11:05:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: bubble.config.bubble_branch,
              worktreePath: bubble.paths.worktreePath
            })
          ),
        launchBubbleSessionAck: (input) => {
          launchInput = {
            implementerCommand: input.implementerCommand,
            reviewerCommand: input.reviewerCommand,
            ...(input.metaReviewerKickoffMessage !== undefined
              ? { metaReviewerKickoffMessage: input.metaReviewerKickoffMessage }
              : {})
          };
          return Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_meta_01" });
        }
      }
    );

    expect(started.state.state).toBe("RUNNING");
    expect(launchInput?.implementerCommand).toContain("PAIRFLOW_EXTERNAL_COMMAND");
    expect(launchInput?.implementerCommand).toContain(
      "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    );
    expect(launchInput?.reviewerCommand).toContain("PAIRFLOW_EXTERNAL_COMMAND");
    expect(launchInput?.metaReviewerKickoffMessage).toContain(
      "resume kickoff (meta-reviewer)"
    );
  });

  it("preserves READY_FOR_HUMAN_APPROVAL on restart without invalid downgrade", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_restart_meta_02",
      task: "Restart recovery human gate task"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const readyForApproval = toPersistedSnapshot(
      applyStateTransition(buildBubbleStateSnapshotVariant(loaded.state), {
        to: "READY_FOR_HUMAN_APPROVAL",
        lastCommandAt: "2026-02-23T12:00:00.000Z"
      })
    );
    const humanGate = {
      ...readyForApproval,
      last_command_at: "2026-02-23T12:01:00.000Z"
    };
    await writeStateSnapshot(bubble.paths.statePath, humanGate, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_restart_meta_02",
      now: new Date("2026-02-23T12:02:00.000Z")
    });

    await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });

    const started = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T12:05:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: bubble.config.bubble_branch,
              worktreePath: bubble.paths.worktreePath
            })
          ),
        launchBubbleSessionAck: () =>
          Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_meta_02" })
      }
    );

    expect(started.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(started.state.round).toBe(humanGate.round);
  });

  it("mints fresh implementer authority on restart and rejects the pre-restart handoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_restart_impl_01",
      task: "Restart recovery implementer authority task"
    });
    const beforeRestart = await readStateSnapshot(bubble.paths.statePath);
    const oldHandoffId = beforeRestart.state.execution_context?.handoff_id;
    const oldExecutionId = beforeRestart.state.execution_context?.execution_id;
    expect(oldHandoffId).toBe(
      "implementer:b_restart_impl_01:round:1:attempt:1"
    );
    expect(oldExecutionId).toBeDefined();

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_restart_impl_01",
      now: new Date("2026-02-23T12:02:00.000Z")
    });

    await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });

    const restarted = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T12:05:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: bubble.config.bubble_branch,
              worktreePath: bubble.paths.worktreePath
            })
          ),
        launchBubbleSessionAck: (input) => {
          expect(input.launchImplementerAgent).toBe(true);
          expect(input.launchReviewerAgent).toBe(false);
          expect(input.launchMetaReviewerAgent).toBe(false);
          return Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_impl_01" });
        }
      }
    );

    expect(restarted.state.execution_context?.handoff_id).toBe(
      "implementer:b_restart_impl_01:round:1:attempt:2"
    );
    expect(restarted.state.execution_context?.attempt).toBe(2);
    expect(restarted.state.execution_context?.execution_id).toBeDefined();
    expect(restarted.state.execution_context?.execution_id).not.toBe(oldExecutionId);

    await expect(
      runAgentEmitCommand([
        "--kind",
        "human_question",
        "--repo",
        repoPath,
        "--bubble-id",
        bubble.bubbleId,
        "--handoff-id",
        String(oldHandoffId),
        "--execution-id",
        String(oldExecutionId),
        "--question",
        "Is the stale authority still valid?"
      ])
    ).rejects.toThrow(/Canonical actor emit handoff mismatch/u);

    const result = await runAgentEmitCommand([
      "--kind",
      "human_question",
      "--repo",
      repoPath,
      "--bubble-id",
      bubble.bubbleId,
      "--handoff-id",
      "implementer:b_restart_impl_01:round:1:attempt:2",
      "--execution-id",
      String(restarted.state.execution_context?.execution_id),
      "--question",
      "Use the fresh post-restart authority."
    ]);

    expect(result?.kind).toBe("human_question");
    if (result === null || result.kind !== "human_question") {
      throw new Error("Expected human_question result.");
    }
    expect(result.human_question.delivery?.status).toBe("rejected");
  });

  it(
    "mints fresh reviewer authority on restart and rejects the pre-restart handoff",
    { timeout: 15_000 },
    async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_restart_reviewer_01",
      task: "Restart recovery reviewer authority task",
      reviewPolicy: {
        meta_review_consecutive_clean_runs_required: 1
      }
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const reviewerExecutionContext = buildRunningExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      activeRole: "reviewer",
      startedAt: "2026-02-23T12:03:00.000Z",
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
    });

    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        execution_context: reviewerExecutionContext,
        active_since: "2026-02-23T12:03:00.000Z",
        last_command_at: "2026-02-23T12:03:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_restart_reviewer_01",
      now: new Date("2026-02-23T12:04:00.000Z")
    });

    await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });

    const restarted = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T12:05:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: bubble.config.bubble_branch,
              worktreePath: bubble.paths.worktreePath
            })
          ),
        launchBubbleSessionAck: () =>
          Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_reviewer_01" })
      }
    );

    expect(restarted.state.active_role).toBe("reviewer");
    expect(restarted.state.execution_context?.handoff_id).toBe(
      "reviewer:b_restart_reviewer_01:round:1:attempt:2"
    );
    expect(restarted.state.execution_context?.attempt).toBe(2);
    expect(restarted.state.execution_context?.execution_id).not.toBe(
      reviewerExecutionContext.execution_id
    );

    await expect(
      runAgentEmitCommand([
        "--kind",
        "pass",
        "--repo",
        repoPath,
        "--bubble-id",
        bubble.bubbleId,
        "--handoff-id",
        reviewerExecutionContext.handoff_id,
        "--execution-id",
        reviewerExecutionContext.execution_id,
        "--summary",
        "Is the stale reviewer authority still valid?",
        "--no-findings"
      ])
    ).rejects.toThrow(/Canonical actor emit handoff mismatch/u);

    const result = await runAgentEmitCommand([
      "--kind",
      "pass",
      "--repo",
      repoPath,
      "--bubble-id",
      bubble.bubbleId,
      "--handoff-id",
      "reviewer:b_restart_reviewer_01:round:1:attempt:2",
      "--execution-id",
      String(restarted.state.execution_context?.execution_id),
      "--summary",
      "Use the fresh reviewer authority after resume.",
      "--no-findings"
    ]);

    expect(result?.kind).toBe("pass");
    if (result === null || result.kind !== "pass") {
      throw new Error("Expected pass result.");
    }
    expect(result.pass.state.active_role).toBe("implementer");
    }
  );

  it("keeps canonical meta-review submit routeable after delivery failure, restart recovery, and missing pane rebinding", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_restart_meta_submit_smoke_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Smoke meta-review restart recovery submit",
      cwd: repoPath
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        review_policy: {
          ...normalizeBubbleReviewPolicy({
            ...(bubble.config.review_policy !== undefined
              ? { review_policy: bubble.config.review_policy }
              : {})
          }),
          meta_review_consecutive_clean_runs_required: 1
        }
      }),
      "utf8"
    );

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T13:00:00.000Z")
      },
      {
        launchBubbleSessionAck: () =>
          Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_meta_submit_smoke_01" })
      }
    );

    const emitDelivery = () =>
      Promise.resolve({
        status: "accepted" as const,
        sessionName: "pf-b_restart_meta_submit_smoke_01",
        targetPaneIndex: 1,
        message: "ok"
      });

    await emitPassFromWorkspace({
      summary: "Implementer handoff round 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-23T13:01:00.000Z")
    }, {
      emitDeliveryNotificationAck: () => emitDelivery(),
      refreshReviewerContext: () => Promise.resolve({ refreshed: false })
    });
    await emitPassFromWorkspace({
      summary: "Reviewer clean handoff round 1",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-23T13:02:00.000Z")
    }, {
      emitDeliveryNotificationAck: () => emitDelivery(),
      refreshReviewerContext: () => Promise.resolve({ refreshed: false })
    });
    await emitPassFromWorkspace({
      summary: "Implementer handoff round 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-23T13:03:00.000Z")
    }, {
      emitDeliveryNotificationAck: () => emitDelivery(),
      refreshReviewerContext: () => Promise.resolve({ refreshed: false })
    });

    const converged = await emitConvergedFromWorkspace(
      {
        summary: "Ready for approval after restart smoke path",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-23T13:04:00.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: (input, dependencies = {}) =>
          applyMetaReviewGateOnConvergence(input, {
            ...dependencies,
            notifyMetaReviewerSubmissionRequest: async () => ({
              status: "failed",
              reasonCode: "META_REVIEWER_PANE_EXITED",
              message: "meta-reviewer pane exited after durable kickoff"
            })
          }),
        emitDeliveryNotificationAck: () => emitDelivery(),
        emitBubbleNotification: async (_config, kind) => ({
          kind,
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        })
      }
    );

    expect(converged.state.state).toBe("RUNNING");

    const afterFailureState = await readStateSnapshot(bubble.paths.statePath);
    expect(afterFailureState.state.meta_review?.runtime_delivery?.status).toBe(
      "failed"
    );
    expect([
      "META_REVIEWER_PANE_EXITED",
      "META_REVIEWER_PANE_RESPAWN_FAILED"
    ]).toContain(afterFailureState.state.meta_review?.runtime_delivery?.reason_code);

    const failedRegistry = await readRuntimeSessionsRegistry(
      bubble.paths.sessionsPath,
      { allowMissing: false }
    );
    expect(failedRegistry[bubble.bubbleId]?.metaReviewerPane?.active).toBe(false);

    await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });

    const restarted = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T13:05:00.000Z")
      },
      {
        launchBubbleSessionAck: () =>
          Promise.resolve({ status: "running" as const, sessionName: "pf-b_restart_meta_submit_smoke_01" })
      }
    );

    expect(restarted.state.state).toBe("RUNNING");

    const restartedRegistry = await readRuntimeSessionsRegistry(
      bubble.paths.sessionsPath,
      { allowMissing: false }
    );
    expect(restartedRegistry[bubble.bubbleId]?.metaReviewerPane).toBeUndefined();

    const submitted = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: restarted.state.round,
        recommendation: "approve",
        summary: "No findings remain after restart recovery smoke.",
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0
        }
      },
      {
        now: new Date("2026-02-23T13:05:30.000Z")
      }
    );

    expect(submitted.gate_route).toBe("human_gate_approve");
    expect(submitted.lifecycle_state).toBe("READY_FOR_HUMAN_APPROVAL");

    const finalState = await readStateSnapshot(bubble.paths.statePath);
    expect(finalState.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
  });
});
