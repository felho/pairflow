import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import {
  BubbleMergeErrorV11 as BubbleMergeError,
  mergeBubbleV11 as mergeBubble
} from "../../../src/v11/application/merge/emitMergeV11.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempPath(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function createTempRepo(): Promise<string> {
  const repoPath = await createTempPath("pairflow-merge-bubble-");
  await initGitRepository(repoPath);
  return repoPath;
}

async function setupDoneBubble(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge bubble test task",
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
      last_command_at: "2026-02-23T10:00:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function convertDoneBubbleToClone(
  repoPath: string,
  bubble: Awaited<ReturnType<typeof setupDoneBubble>>
) {
  await writeFile(
    bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...bubble.config,
      work_mode: "clone"
    }),
    "utf8"
  );
  await runGit(repoPath, ["worktree", "remove", "--force", bubble.paths.worktreePath]);
  await runGit(repoPath, ["clone", repoPath, bubble.paths.worktreePath]);
  await runGit(bubble.paths.worktreePath, ["config", "user.email", "pairflow@example.test"]);
  await runGit(bubble.paths.worktreePath, ["config", "user.name", "Pairflow Test"]);
  await runGit(bubble.paths.worktreePath, ["checkout", bubble.config.bubble_branch]);
  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("mergeBubble", () => {
  it("merges DONE bubble branch into base and cleans runtime/worktree artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupDoneBubble(repoPath, "b_merge_01");

    let terminateCalled = false;
    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T10:05:00.000Z")
      },
      {
        terminateBubbleTmuxSession: (input) => {
          terminateCalled = true;
          return Promise.resolve({
            sessionName: `pf-${input.bubbleId ?? "unknown"}`,
            existed: false
          });
        }
      }
    );

    expect(terminateCalled).toBe(true);
    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);
    expect(result.mergeCommitSha.length).toBeGreaterThan(6);

    const branch = (await runGit(repoPath, ["branch", "--show-current"])).stdout.trim();
    expect(branch).toBe("main");

    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const featureContent = await runGit(repoPath, ["show", "HEAD:feature.txt"]);
    expect(featureContent.stdout.trim()).toBe("b_merge_01");

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("DONE");
    expect(state.state.last_command_at).toBe("2026-02-23T10:05:00.000Z");
  });

  it("rejects merge when bubble is not DONE", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_merge_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Merge bubble test task",
      cwd: repoPath
    });

    await expect(
      mergeBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(BubbleMergeError);
  });

  it("supports optional push + delete-remote cleanup flow", async () => {
    const repoPath = await createTempRepo();
    const remotePath = await createTempPath("pairflow-merge-remote-");
    await runGit(remotePath, ["init", "--bare"]);
    await runGit(repoPath, ["remote", "add", "origin", remotePath]);
    await runGit(repoPath, ["push", "-u", "origin", "main"]);

    const bubble = await setupDoneBubble(repoPath, "b_merge_03");
    await runGit(repoPath, ["push", "origin", bubble.config.bubble_branch]);

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        push: true,
        deleteRemote: true
      },
      {
        terminateBubbleTmuxSession: (input) =>
          Promise.resolve({
            sessionName: `pf-${input.bubbleId ?? "unknown"}`,
            existed: false
          })
      }
    );

    expect(result.pushedBaseBranch).toBe(true);
    expect(result.deletedRemoteBranch).toBe(true);

    const remoteBubble = await runGit(
      repoPath,
      ["ls-remote", "--heads", "origin", bubble.config.bubble_branch],
      true
    );
    expect(remoteBubble.stdout.trim()).toBe("");
  });

  it("merges clone-mode bubbles from the source repo branch and removes the owned clone workspace", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToClone(
      repoPath,
      await setupDoneBubble(repoPath, "b_merge_clone_01")
    );

    const result = await mergeBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T10:10:00.000Z")
      },
      {
        terminateBubbleTmuxSession: (input) =>
          Promise.resolve({
            sessionName: `pf-${input.bubbleId ?? "unknown"}`,
            existed: false
          })
      }
    );

    expect(result.baseBranch).toBe("main");
    expect(result.bubbleBranch).toBe(bubble.config.bubble_branch);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);

    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const featureContent = await runGit(repoPath, ["show", "HEAD:feature.txt"]);
    expect(featureContent.stdout.trim()).toBe("b_merge_clone_01");
  });

  it("fails closed for clone-mode merge when the source repo bubble branch is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDoneBubbleToClone(
      repoPath,
      await setupDoneBubble(repoPath, "b_merge_clone_missing_branch_01")
    );

    await runGit(repoPath, ["branch", "-D", bubble.config.bubble_branch]);

    await expect(
      mergeBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T10:11:00.000Z")
      })
    ).rejects.toBeInstanceOf(BubbleMergeError);

    const workspaceStats = await stat(bubble.paths.worktreePath);
    expect(workspaceStats.isDirectory()).toBe(true);
  });
});
