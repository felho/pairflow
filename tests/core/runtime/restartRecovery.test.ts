import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { submitMetaReviewResult } from "../../../src/core/bubble/metaReview.js";
import { applyMetaReviewGateOnConvergence } from "../../../src/core/bubble/metaReviewGate.js";
import { startBubble } from "../../../src/core/bubble/startBubble.js";
import { buildMetaReviewExecutionContext } from "../../../src/core/bubble/metaReviewExecutionContext.js";
import {
  readRuntimeSessionsRegistry,
  upsertRuntimeSession
} from "../../../src/core/runtime/sessionsRegistry.js";
import { reconcileRuntimeSessions } from "../../../src/core/runtime/startupReconciler.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

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
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: bubble.config.bubble_branch,
            worktreePath: bubble.paths.worktreePath
          });
        },
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_restart_01" })
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

  it("preserves META_REVIEW_RUNNING on restart and keeps worktree-local pairflow bootstrap active", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_restart_meta_01",
      task: "Restart recovery meta-review task"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const readyForApproval = applyStateTransition(loaded.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-23T11:00:00.000Z"
    });
    const metaReviewRunning = {
      ...readyForApproval,
      state: "META_REVIEW_RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "meta_reviewer" as const,
      active_since: "2026-02-23T11:01:00.000Z",
      last_command_at: "2026-02-23T11:01:00.000Z",
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: bubble.config.bubble_branch,
            worktreePath: bubble.paths.worktreePath
          }),
        launchBubbleTmuxSession: (input) => {
          launchInput = {
            implementerCommand: input.implementerCommand,
            reviewerCommand: input.reviewerCommand,
            ...(input.metaReviewerKickoffMessage !== undefined
              ? { metaReviewerKickoffMessage: input.metaReviewerKickoffMessage }
              : {})
          };
          return Promise.resolve({ sessionName: "pf-b_restart_meta_01" });
        }
      }
    );

    expect(started.state.state).toBe("META_REVIEW_RUNNING");
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
    const readyForApproval = applyStateTransition(loaded.state, {
      to: "READY_FOR_APPROVAL",
      lastCommandAt: "2026-02-23T12:00:00.000Z"
    });
    const humanGate = applyStateTransition(readyForApproval, {
      to: "READY_FOR_HUMAN_APPROVAL",
      lastCommandAt: "2026-02-23T12:01:00.000Z"
    });
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: bubble.config.bubble_branch,
            worktreePath: bubble.paths.worktreePath
          }),
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_restart_meta_02" })
      }
    );

    expect(started.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(started.state.round).toBe(humanGate.round);
  });

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

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-02-23T13:00:00.000Z")
      },
      {
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_restart_meta_submit_smoke_01" })
      }
    );

    const emitDelivery = () =>
      Promise.resolve({
        delivered: true,
        sessionName: "pf-b_restart_meta_submit_smoke_01",
        message: "ok"
      });

    await emitPassFromWorkspace({
      summary: "Implementer handoff round 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-23T13:01:00.000Z")
    }, {
      emitTmuxDeliveryNotification: () => emitDelivery(),
      refreshReviewerContext: () => Promise.resolve({ refreshed: false })
    });
    await emitPassFromWorkspace({
      summary: "Reviewer clean handoff round 1",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-23T13:02:00.000Z")
    }, {
      emitTmuxDeliveryNotification: () => emitDelivery(),
      refreshReviewerContext: () => Promise.resolve({ refreshed: false })
    });
    await emitPassFromWorkspace({
      summary: "Implementer handoff round 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-23T13:03:00.000Z")
    }, {
      emitTmuxDeliveryNotification: () => emitDelivery(),
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
        emitTmuxDeliveryNotification: () => emitDelivery(),
        emitBubbleNotification: async (_config, kind) => ({
          kind,
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        })
      }
    );

    expect(converged.state.state).toBe("META_REVIEW_RUNNING");

    const afterFailureState = await readStateSnapshot(bubble.paths.statePath);
    expect(afterFailureState.state.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEWER_PANE_EXITED"
    });

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
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_restart_meta_submit_smoke_01" })
      }
    );

    expect(restarted.state.state).toBe("META_REVIEW_RUNNING");

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
