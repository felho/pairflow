import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { startBubble } from "../../../src/core/bubble/startBubble.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  reconcileRuntimeSessions,
  StartupReconcilerError
} from "../../../src/core/runtime/startupReconciler.js";
import {
  readRuntimeSessionsRegistry,
  upsertRuntimeSession
} from "../../../src/core/runtime/sessionsRegistry.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-reconcile-runtime-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function createTempDir(prefix = "pairflow-reconcile-runtime-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
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

describe("reconcileRuntimeSessions", () => {
  it("detects and removes stale sessions for missing bubble and final-state bubble", async () => {
    const repoPath = await createTempRepo();
    const bubbleActive = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_reconcile_01",
      task: "Active bubble"
    });
    const bubbleFinal = await createBubble({
      id: "b_reconcile_02",
      repoPath,
      baseBranch: "main",
      task: "Final bubble",
      cwd: repoPath
    });

    const loaded = await readStateSnapshot(bubbleFinal.paths.statePath);
    const cancelled = applyStateTransition(loaded.state, {
      to: "CANCELLED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-22T19:00:00.000Z"
    });
    await writeStateSnapshot(bubbleFinal.paths.statePath, cancelled, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    });

    await upsertRuntimeSession({
      sessionsPath: bubbleActive.paths.sessionsPath,
      bubbleId: bubbleActive.bubbleId,
      repoPath,
      worktreePath: bubbleActive.paths.worktreePath,
      tmuxSessionName: "pf-b_reconcile_01",
      now: new Date("2026-02-22T19:00:01.000Z")
    });
    await upsertRuntimeSession({
      sessionsPath: bubbleActive.paths.sessionsPath,
      bubbleId: bubbleFinal.bubbleId,
      repoPath,
      worktreePath: bubbleFinal.paths.worktreePath,
      tmuxSessionName: "pf-b_reconcile_02",
      now: new Date("2026-02-22T19:00:02.000Z")
    });
    await upsertRuntimeSession({
      sessionsPath: bubbleActive.paths.sessionsPath,
      bubbleId: "b_reconcile_missing",
      repoPath,
      worktreePath: "/tmp/missing",
      tmuxSessionName: "pf-b_reconcile_missing",
      now: new Date("2026-02-22T19:00:03.000Z")
    });

    const preview = await reconcileRuntimeSessions({
      repoPath,
      dryRun: true,
      isTmuxSessionAlive: (sessionName) =>
        Promise.resolve(sessionName === "pf-b_reconcile_01")
    });
    expect(preview.staleCandidates).toBe(2);
    expect(preview.sessionsBefore).toBe(3);
    expect(preview.sessionsAfter).toBe(3);
    expect(preview.actions.map((action) => action.reason).sort()).toEqual([
      "final_state",
      "missing_bubble"
    ]);

    const applied = await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: (sessionName) =>
        Promise.resolve(sessionName === "pf-b_reconcile_01")
    });
    expect(applied.staleCandidates).toBe(2);
    expect(applied.sessionsBefore).toBe(3);
    expect(applied.sessionsAfter).toBe(1);
    expect(applied.actions.every((action) => action.removed)).toBe(true);

    const registry = await readRuntimeSessionsRegistry(bubbleActive.paths.sessionsPath, {
      allowMissing: false
    });
    expect(Object.keys(registry)).toEqual(["b_reconcile_01"]);
  });

  it("treats invalid state snapshot as stale runtime session", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_reconcile_03",
      repoPath,
      baseBranch: "main",
      task: "Invalid state bubble",
      cwd: repoPath
    });

    await writeFile(bubble.paths.statePath, "{invalid-json", "utf8");
    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_reconcile_03",
      now: new Date("2026-02-22T19:10:00.000Z")
    });

    const report = await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(true)
    });
    expect(report.staleCandidates).toBe(1);
    expect(report.actions[0]?.reason).toBe("invalid_state");
    expect(report.sessionsAfter).toBe(0);
  });

  it("rejects when cwd is not inside a git repository", async () => {
    const dir = await createTempDir();
    await expect(
      reconcileRuntimeSessions({ cwd: dir })
    ).rejects.toBeInstanceOf(StartupReconcilerError);
  });

  it("treats missing tmux session as stale for runtime states", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_reconcile_05",
      task: "Runtime stale by missing tmux"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_reconcile_05",
      now: new Date("2026-02-22T19:30:00.000Z")
    });

    const report = await reconcileRuntimeSessions({
      repoPath,
      isTmuxSessionAlive: () => Promise.resolve(false)
    });
    expect(report.staleCandidates).toBe(1);
    expect(report.actions[0]?.reason).toBe("missing_tmux_session");
    expect(report.actions[0]?.removed).toBe(true);
    expect(report.sessionsAfter).toBe(0);
  });

  it("removes stale pre-runtime session and keeps start unblocked", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_reconcile_04",
      repoPath,
      baseBranch: "main",
      task: "Stale pre-runtime session",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_reconcile_04",
      now: new Date("2026-02-22T19:20:00.000Z")
    });

    const report = await reconcileRuntimeSessions({ repoPath });
    expect(report.actions.some((action) => action.reason === "non_runtime_state")).toBe(
      true
    );

    let bootstrapCalled = false;
    const started = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T19:21:00.000Z")
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
          Promise.resolve({ sessionName: "pf-b_reconcile_04" })
      }
    );

    expect(started.state.state).toBe("RUNNING");
    expect(bootstrapCalled).toBe(true);
  });
});
