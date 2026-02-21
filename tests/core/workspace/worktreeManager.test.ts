import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  WorkspaceBootstrapError,
  cleanupWorktreeWorkspace,
  bootstrapWorktreeWorkspace
} from "../../../src/core/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createGitRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-worktree-manager-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function createWorktreePath(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-worktree-target-"));
  tempDirs.push(root);
  return join(root, name);
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("bootstrapWorktreeWorkspace", () => {
  it("creates bubble branch and worktree from base branch", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_1");

    const result = await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: "bubble/b_1",
      worktreePath
    });

    expect(result.baseRef).toBe("refs/heads/main");
    expect(result.worktreePath).toBe(worktreePath);

    const branchCheck = await runGit(
      repoPath,
      ["show-ref", "--verify", "--quiet", "refs/heads/bubble/b_1"],
      true
    );
    expect(branchCheck.exitCode).toBe(0);

    const headBranch = await runGit(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"]);
    expect(headBranch.stdout.trim()).toBe("bubble/b_1");
  });

  it("rejects when bubble branch already exists", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_exists");
    await runGit(repoPath, ["branch", "bubble/b_exists", "main"]);

    await expect(
      bootstrapWorktreeWorkspace({
        repoPath,
        baseBranch: "main",
        bubbleBranch: "bubble/b_exists",
        worktreePath
      })
    ).rejects.toBeInstanceOf(WorkspaceBootstrapError);
  });

  it("rejects when base branch is missing", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_missing_base");

    await expect(
      bootstrapWorktreeWorkspace({
        repoPath,
        baseBranch: "does-not-exist",
        bubbleBranch: "bubble/b_missing_base",
        worktreePath
      })
    ).rejects.toThrow(/Base branch not found/u);
  });

  it("rejects git tags as base refs", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_from_tag");
    await runGit(repoPath, ["tag", "v1.0.0", "main"]);

    await expect(
      bootstrapWorktreeWorkspace({
        repoPath,
        baseBranch: "v1.0.0",
        bubbleBranch: "bubble/b_from_tag",
        worktreePath
      })
    ).rejects.toThrow(/Tags are not supported for --base/u);
  });

  it("rejects when worktree path already exists", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_exists");
    await mkdir(join(worktreePath, ".."), { recursive: true });
    await writeFile(worktreePath, "exists", "utf8");

    await expect(
      bootstrapWorktreeWorkspace({
        repoPath,
        baseBranch: "main",
        bubbleBranch: "bubble/b_exists_path",
        worktreePath
      })
    ).rejects.toThrow(/Path already exists/u);
  });
});

describe("cleanupWorktreeWorkspace", () => {
  it("removes both worktree and bubble branch", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_cleanup_1");

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: "bubble/b_cleanup_1",
      worktreePath
    });

    const result = await cleanupWorktreeWorkspace({
      repoPath,
      bubbleBranch: "bubble/b_cleanup_1",
      worktreePath
    });

    expect(result.removedWorktree).toBe(true);
    expect(result.removedBranch).toBe(true);

    const listedWorktrees = await runGit(repoPath, ["worktree", "list", "--porcelain"]);
    expect(listedWorktrees.stdout).not.toContain(`worktree ${worktreePath}`);

    const branchCheck = await runGit(
      repoPath,
      ["show-ref", "--verify", "--quiet", "refs/heads/bubble/b_cleanup_1"],
      true
    );
    expect(branchCheck.exitCode).not.toBe(0);
  });

  it("is no-op when worktree and branch are already absent", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_missing");

    const result = await cleanupWorktreeWorkspace({
      repoPath,
      bubbleBranch: "bubble/b_missing",
      worktreePath
    });

    expect(result.removedWorktree).toBe(false);
    expect(result.removedBranch).toBe(false);
  });
});
