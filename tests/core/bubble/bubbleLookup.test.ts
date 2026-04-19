import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { resolveBubbleById } from "../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-lookup-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => path);
}

afterEach(async () => {
  delete process.env.PAIRFLOW_WORKTREE_ROOT;
  delete process.env.PAIRFLOW_REMOTE_START_MODE;
  delete process.env.PAIRFLOW_REMOTE_START_WORKSPACE_ROOT;
  delete process.env.PAIRFLOW_REMOTE_COMMIT_MODE;
  delete process.env.PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT;
  delete process.env.PAIRFLOW_REMOTE_MERGE_MODE;
  delete process.env.PAIRFLOW_REMOTE_MERGE_WORKSPACE_ROOT;
  delete process.env.PAIRFLOW_REMOTE_DELETE_MODE;
  delete process.env.PAIRFLOW_REMOTE_DELETE_WORKSPACE_ROOT;
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("resolveBubbleById", () => {
  it("falls back to PAIRFLOW_WORKTREE_ROOT when cwd is outside the repository", async () => {
    const repoPath = await createTempRepo();
    const outsideDir = await mkdtemp(join(tmpdir(), "pairflow-bubble-lookup-outside-"));
    tempDirs.push(outsideDir);

    const bubble = await createBubble({
      id: "b_lookup_env_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    process.env.PAIRFLOW_WORKTREE_ROOT = bubble.paths.worktreePath;

    const resolved = await resolveBubbleById({
      bubbleId: bubble.config.id,
      cwd: outsideDir
    });

    expect(resolved.bubbleId).toBe("b_lookup_env_01");
    expect(resolved.repoPath).toBe(repoPath);
  });

  it("uses remote clone workspace authority when remote execution env is active and the derived worktree is absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_lookup_remote_clone_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote clone authority",
      cwd: repoPath
    });

    process.env.PAIRFLOW_REMOTE_START_MODE = "inner_remote_activation";
    process.env.PAIRFLOW_REMOTE_START_WORKSPACE_ROOT = repoPath;

    const resolved = await resolveBubbleById({
      bubbleId: bubble.config.id,
      repoPath
    });

    expect(resolved.repoPath).toBe(repoPath);
    expect(resolved.bubblePaths.worktreePath).toBe(await normalizePath(repoPath));
  });

  it("preserves the derived worktree path when the worktree already exists even under remote execution env", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_lookup_remote_clone_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Existing worktree remains canonical",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    process.env.PAIRFLOW_REMOTE_START_MODE = "inner_remote_activation";
    process.env.PAIRFLOW_REMOTE_START_WORKSPACE_ROOT = repoPath;

    const resolved = await resolveBubbleById({
      bubbleId: bubble.config.id,
      repoPath
    });

    expect(resolved.repoPath).toBe(repoPath);
    expect(resolved.bubblePaths.worktreePath).toBe(bubble.paths.worktreePath);
  });
});
