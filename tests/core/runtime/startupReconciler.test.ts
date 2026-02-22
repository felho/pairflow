import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
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
    const bubbleActive = await createBubble({
      id: "b_reconcile_01",
      repoPath,
      baseBranch: "main",
      task: "Active bubble",
      cwd: repoPath
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
      dryRun: true
    });
    expect(preview.staleCandidates).toBe(2);
    expect(preview.sessionsBefore).toBe(3);
    expect(preview.sessionsAfter).toBe(3);
    expect(preview.actions.map((action) => action.reason).sort()).toEqual([
      "final_state",
      "missing_bubble"
    ]);

    const applied = await reconcileRuntimeSessions({
      repoPath
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

    const report = await reconcileRuntimeSessions({ repoPath });
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
});
