import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { startBubble } from "../../../src/core/bubble/startBubble.js";
import { startBubbleV11 } from "../../../src/v11/application/start/emitStartV11.js";
import { initGitRepository } from "../../helpers/git.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-start-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

describe("v11 start contract parity", () => {
  it("keeps core facade and v11 start output parity on CREATED bubble", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await createBubble({
        id: "b_start_contract_legacy",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Start contract parity fixture",
        cwd: repoPath
      });

      return startBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-20T09:00:00.000Z")
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
            Promise.resolve({
              sessionName: `pf-${bubble.bubbleId}`
            }),
          claimRuntimeSession: () =>
            Promise.resolve({
              claimed: true,
              record: {
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath,
                tmuxSessionName: `pf-${bubble.bubbleId}`,
                updatedAt: "2026-03-20T09:00:00.000Z"
              }
            })
        }
      );
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await createBubble({
        id: "b_start_contract_v11",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Start contract parity fixture",
        cwd: repoPath
      });

      return startBubbleV11(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-20T09:00:00.000Z")
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
            Promise.resolve({
              sessionName: `pf-${bubble.bubbleId}`
            }),
          claimRuntimeSession: () =>
            Promise.resolve({
              claimed: true,
              record: {
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath,
                tmuxSessionName: `pf-${bubble.bubbleId}`,
                updatedAt: "2026-03-20T09:00:00.000Z"
              }
            })
        }
      );
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      state: result.state.state,
      round: result.state.round,
      activeAgent: result.state.active_agent,
      activeRole: result.state.active_role,
      tmuxSessionNamePrefix: result.tmuxSessionName.startsWith("pf-"),
      hasWorktreePath: result.worktreePath.length > 0
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      state: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      tmuxSessionNamePrefix: true,
      hasWorktreePath: true
    });
  });
});
