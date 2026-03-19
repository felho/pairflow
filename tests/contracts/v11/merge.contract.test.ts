import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { mergeBubble } from "../../../src/core/bubble/mergeBubble.js";
import { mergeBubbleV11 } from "../../../src/v11/application/merge/emitMergeV11.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-merge-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

async function setupDoneBubble(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge contract parity fixture",
    cwd: repoPath
  });

  await bootstrapWorktreeWorkspace({
    repoPath,
    baseBranch: "main",
    bubbleBranch: bubble.config.bubble_branch,
    worktreePath: bubble.paths.worktreePath
  });

  await writeFile(
    join(bubble.paths.worktreePath, "feature.txt"),
    `${bubbleId}\n`,
    "utf8"
  );
  await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
  await runGit(bubble.paths.worktreePath, ["commit", "-m", `feat(${bubbleId}): change`]);

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "DONE",
      active_agent: null,
      active_role: null,
      active_since: null,
      last_command_at: "2026-03-19T23:00:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

describe("v11 merge contract parity", () => {
  it("keeps core facade and v11 merge output parity on DONE bubble", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await setupDoneBubble(repoPath, "b_merge_contract_legacy");
      return mergeBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-19T23:05:00.000Z")
        },
        {
          terminateBubbleTmuxSession: (input) =>
            Promise.resolve({
              sessionName: `pf-${input.bubbleId ?? "unknown"}`,
              existed: false
            })
        }
      );
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await setupDoneBubble(repoPath, "b_merge_contract_v11");
      return mergeBubbleV11(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-19T23:05:00.000Z")
        },
        {
          terminateBubbleTmuxSession: (input) =>
            Promise.resolve({
              sessionName: `pf-${input.bubbleId ?? "unknown"}`,
              existed: false
            })
        }
      );
    });

    const normalize = (result: typeof legacy) => ({
      baseBranch: result.baseBranch,
      bubbleBranchPrefix: result.bubbleBranch.startsWith("bubble/"),
      pushedBaseBranch: result.pushedBaseBranch,
      deletedRemoteBranch: result.deletedRemoteBranch,
      tmuxSessionExisted: result.tmuxSessionExisted,
      runtimeSessionRemoved: result.runtimeSessionRemoved,
      removedWorktree: result.removedWorktree,
      removedBubbleBranch: result.removedBubbleBranch,
      hasMergeCommitSha: result.mergeCommitSha.length > 6
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      baseBranch: "main",
      bubbleBranchPrefix: true,
      pushedBaseBranch: false,
      deletedRemoteBranch: false,
      tmuxSessionExisted: false,
      runtimeSessionRemoved: false,
      removedWorktree: true,
      removedBubbleBranch: true,
      hasMergeCommitSha: true
    });
  });
});
