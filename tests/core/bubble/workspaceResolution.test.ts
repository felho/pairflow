import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-workspace-resolution-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  delete process.env.PAIRFLOW_WORKTREE_ROOT;
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("resolveBubbleFromWorkspaceCwd", () => {
  it("resolves bubble from worktree using branch-derived bubble id", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_resolve_01",
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
      worktreePath: bubble.paths.worktreePath
    });

    const resolved = await resolveBubbleFromWorkspaceCwd(bubble.paths.worktreePath);
    const normalizedResolvedRepoPath = await realpath(resolved.repoPath);
    const normalizedRepoPath = await realpath(repoPath);
    const normalizedResolvedWorktreePath = await realpath(resolved.worktreePath);
    const normalizedWorktreePath = await realpath(bubble.paths.worktreePath);

    expect(resolved.bubbleId).toBe("b_resolve_01");
    expect(normalizedResolvedRepoPath).toBe(normalizedRepoPath);
    expect(normalizedResolvedWorktreePath).toBe(normalizedWorktreePath);
  });

  it("falls back to config scan when HEAD is detached", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_resolve_02",
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
      worktreePath: bubble.paths.worktreePath
    });
    await runGit(bubble.paths.worktreePath, ["checkout", "--detach"]);

    const resolved = await resolveBubbleFromWorkspaceCwd(bubble.paths.worktreePath);
    expect(resolved.bubbleId).toBe("b_resolve_02");
  });

  it("rejects when cwd is not a git repository", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pairflow-workspace-resolution-non-git-"));
    tempDirs.push(dir);

    await expect(
      resolveBubbleFromWorkspaceCwd(dir)
    ).rejects.toBeInstanceOf(WorkspaceResolutionError);
  });

  it("rejects when cwd is git repo but no matching bubble config", async () => {
    const repoPath = await createTempRepo();

    await expect(
      resolveBubbleFromWorkspaceCwd(repoPath)
    ).rejects.toThrow(/No bubble config found/u);
  });

  it("falls back to PAIRFLOW_WORKTREE_ROOT when cwd is outside the repository", async () => {
    const repoPath = await createTempRepo();
    const outsideDir = await mkdtemp(join(tmpdir(), "pairflow-workspace-resolution-outside-"));
    tempDirs.push(outsideDir);

    const bubble = await createBubble({
      id: "b_resolve_03",
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
      worktreePath: bubble.paths.worktreePath
    });

    process.env.PAIRFLOW_WORKTREE_ROOT = bubble.paths.worktreePath;

    const resolved = await resolveBubbleFromWorkspaceCwd(outsideDir);

    expect(resolved.bubbleId).toBe("b_resolve_03");
    expect(await realpath(resolved.worktreePath)).toBe(
      await realpath(bubble.paths.worktreePath)
    );
  });
});
