import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { restartBubble } from "../../../src/core/bubble/restartBubble.js";
import type { StartBubbleResult } from "../../../src/core/bubble/startBubble.js";
import { restartBubbleV11 } from "../../../src/v11/application/restart/emitRestartV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-restart-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

describe("v11 restart contract parity", () => {
  it("keeps core facade and v11 restart output parity on running bubble", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: "b_restart_contract_legacy",
        task: "Restart contract parity fixture"
      });
      return restartBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-19T23:20:00.000Z")
        },
        {
          terminateBubbleTmuxSession: () =>
            Promise.resolve({
              sessionName: `pf-${bubble.bubbleId}`,
              existed: false
            }),
          removeRuntimeSession: () => Promise.resolve(false),
          startBubble: () =>
            Promise.resolve({
              bubbleId: bubble.bubbleId,
              state: { state: "RUNNING" },
              tmuxSessionName: `pf-${bubble.bubbleId}`,
              worktreePath: bubble.paths.worktreePath
            } as unknown as StartBubbleResult)
        }
      );
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: "b_restart_contract_v11",
        task: "Restart contract parity fixture"
      });
      return restartBubbleV11(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-19T23:20:00.000Z")
        },
        {
          terminateBubbleTmuxSession: () =>
            Promise.resolve({
              sessionName: `pf-${bubble.bubbleId}`,
              existed: false
            }),
          removeRuntimeSession: () => Promise.resolve(false),
          startBubble: () =>
            Promise.resolve({
              bubbleId: bubble.bubbleId,
              state: { state: "RUNNING" },
              tmuxSessionName: `pf-${bubble.bubbleId}`,
              worktreePath: bubble.paths.worktreePath
            } as unknown as StartBubbleResult)
        }
      );
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      state: result.state.state,
      tmuxSessionNamePrefix: result.tmuxSessionName.startsWith("pf-"),
      hasWorktreePath: result.worktreePath.length > 0,
      previousTmuxSessionExisted: result.previousTmuxSessionExisted,
      previousRuntimeSessionRemoved: result.previousRuntimeSessionRemoved
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      state: "RUNNING",
      tmuxSessionNamePrefix: true,
      hasWorktreePath: true,
      previousTmuxSessionExisted: false,
      previousRuntimeSessionRemoved: false
    });
  });
});
