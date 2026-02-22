import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { startBubble } from "../../../src/core/bubble/startBubble.js";
import {
  readRuntimeSessionsRegistry,
  upsertRuntimeSession
} from "../../../src/core/runtime/sessionsRegistry.js";
import { reconcileRuntimeSessions } from "../../../src/core/runtime/startupReconciler.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
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
});
