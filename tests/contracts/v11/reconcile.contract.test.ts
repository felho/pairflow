import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { reconcileRuntimeSessions } from "../../../src/core/runtime/startupReconciler.js";
import { reconcileRuntimeSessionsV11 } from "../../../src/v11/application/reconcile/emitReconcileV11.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reconcile-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

async function seedRuntimeSessionsFixture(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Reconcile contract parity fixture"
  });

  await upsertRuntimeSession({
    sessionsPath: bubble.paths.sessionsPath,
    bubbleId: bubble.bubbleId,
    repoPath,
    worktreePath: bubble.paths.worktreePath,
    tmuxSessionName: `pf-${bubble.bubbleId}`,
    now: new Date("2026-03-19T23:45:00.000Z")
  });

  await upsertRuntimeSession({
    sessionsPath: bubble.paths.sessionsPath,
    bubbleId: "b_reconcile_contract_missing",
    repoPath,
    worktreePath: "/tmp/missing",
    tmuxSessionName: "pf-b_reconcile_contract_missing",
    now: new Date("2026-03-19T23:45:01.000Z")
  });
}

describe("v11 reconcile contract parity", () => {
  it("keeps core facade and v11 reconcile output parity", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      await seedRuntimeSessionsFixture(repoPath, "b_reconcile_contract_active");
      return reconcileRuntimeSessions({
        repoPath,
        dryRun: true,
        isTmuxSessionAlive: (sessionName) =>
          Promise.resolve(sessionName === "pf-b_reconcile_contract_active")
      });
    });

    const v11 = await withTempRepo(async (repoPath) => {
      await seedRuntimeSessionsFixture(repoPath, "b_reconcile_contract_active");
      return reconcileRuntimeSessionsV11({
        repoPath,
        dryRun: true,
        isTmuxSessionAlive: (sessionName) =>
          Promise.resolve(sessionName === "pf-b_reconcile_contract_active")
      });
    });

    const normalize = (result: typeof legacy) => ({
      dryRun: result.dryRun,
      sessionsBefore: result.sessionsBefore,
      sessionsAfter: result.sessionsAfter,
      staleCandidates: result.staleCandidates,
      actionReasons: result.actions.map((action) => action.reason).sort(),
      actionRemovedFlags: result.actions.map((action) => action.removed)
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      dryRun: true,
      sessionsBefore: 2,
      sessionsAfter: 2,
      staleCandidates: 1,
      actionReasons: ["missing_bubble"],
      actionRemovedFlags: [false]
    });
  });
});
