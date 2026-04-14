import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  WorkspaceBootstrapError,
  cleanupWorktreeWorkspace,
  bootstrapWorktreeWorkspace
} from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
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

async function createCloneWorkspace(input: {
  repoPath: string;
  worktreePath: string;
  bubbleBranch: string;
}): Promise<void> {
  await runGit(input.repoPath, ["branch", input.bubbleBranch, "main"]);
  await runGit(input.repoPath, ["clone", input.repoPath, input.worktreePath]);
  await runGit(input.worktreePath, ["config", "user.email", "pairflow@example.test"]);
  await runGit(input.worktreePath, ["config", "user.name", "Pairflow Test"]);
  await runGit(input.worktreePath, ["checkout", input.bubbleBranch]);
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
    expect(result.workspacePath).toBe(worktreePath);
    expect(result.workspaceKind).toBe("worktree");
    expect(result.branchPrepared).toBe(true);

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

  it("syncs default local overlay entries as symlinks when sources exist", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_overlay_default");
    await mkdir(join(repoPath, ".claude"), { recursive: true });
    await writeFile(join(repoPath, ".claude", "settings.json"), "{\"ok\":true}\n", "utf8");
    await writeFile(join(repoPath, ".env.local"), "A=1\n", "utf8");

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: "bubble/b_overlay_default",
      worktreePath
    });

    const claudeStats = await lstat(join(worktreePath, ".claude"));
    expect(claudeStats.isSymbolicLink()).toBe(true);
    expect(await readlink(join(worktreePath, ".claude"))).toBe(
      join(repoPath, ".claude")
    );

    const envStats = await lstat(join(worktreePath, ".env.local"));
    expect(envStats.isSymbolicLink()).toBe(true);
    expect(await readFile(join(worktreePath, ".env.local"), "utf8")).toBe("A=1\n");
  });

  it("supports copy mode for local overlay entries", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_overlay_copy");
    await writeFile(join(repoPath, ".env.local"), "A=copy\n", "utf8");

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: "bubble/b_overlay_copy",
      worktreePath,
      localOverlay: {
        enabled: true,
        mode: "copy",
        entries: [".env.local"]
      }
    });

    const envStats = await lstat(join(worktreePath, ".env.local"));
    expect(envStats.isSymbolicLink()).toBe(false);
    expect(await readFile(join(worktreePath, ".env.local"), "utf8")).toBe("A=copy\n");
  });

  it("does not overwrite existing worktree files during local overlay sync", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_overlay_existing");

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: "bubble/b_overlay_existing",
      worktreePath,
      localOverlay: {
        enabled: true,
        mode: "symlink",
        entries: ["README.md"]
      }
    });

    const readmePath = join(worktreePath, "README.md");
    const readmeStats = await lstat(readmePath);
    expect(readmeStats.isSymbolicLink()).toBe(false);
    expect(await readFile(readmePath, "utf8")).toBe("# Pairflow\n");
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

  it("removes clone workspace and source branch when ownership proof matches", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_clone_owned");

    await createCloneWorkspace({
      repoPath,
      worktreePath,
      bubbleBranch: "bubble/b_clone_owned"
    });

    const result = await cleanupWorktreeWorkspace({
      repoPath,
      bubbleBranch: "bubble/b_clone_owned",
      worktreePath
    });

    expect(result.removedWorktree).toBe(true);
    expect(result.removedBranch).toBe(true);
    await expect(lstat(worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("keeps source branch when clone workspace ownership proof is unclear", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_clone_unowned");

    await createCloneWorkspace({
      repoPath,
      worktreePath,
      bubbleBranch: "bubble/b_clone_unowned"
    });
    await runGit(repoPath, ["checkout", "bubble/b_clone_unowned"]);
    await writeFile(join(repoPath, "source-diverged.txt"), "source moved\n", "utf8");
    await runGit(repoPath, ["add", "source-diverged.txt"]);
    await runGit(repoPath, ["commit", "-m", "feat(source): move branch"]);
    await runGit(repoPath, ["checkout", "main"]);

    const result = await cleanupWorktreeWorkspace({
      repoPath,
      bubbleBranch: "bubble/b_clone_unowned",
      worktreePath
    });

    expect(result.removedWorktree).toBe(true);
    expect(result.removedBranch).toBe(false);
    const branchCheck = await runGit(
      repoPath,
      ["show-ref", "--verify", "--quiet", "refs/heads/bubble/b_clone_unowned"],
      true
    );
    expect(branchCheck.exitCode).toBe(0);
  });

  it("accepts clone branch ownership after a post-bootstrap clone commit is synced back to the source branch", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_clone_post_commit_owned");
    const bubbleBranch = "bubble/b_clone_post_commit_owned";

    await createCloneWorkspace({
      repoPath,
      worktreePath,
      bubbleBranch
    });
    await writeFile(join(worktreePath, "clone-owned.txt"), "owned after sync\n", "utf8");
    await runGit(worktreePath, ["add", "clone-owned.txt"]);
    await runGit(worktreePath, ["commit", "-m", "feat(clone): owned after sync"]);
    await runGit(worktreePath, ["push", repoPath, `HEAD:refs/heads/${bubbleBranch}`]);

    const result = await cleanupWorktreeWorkspace({
      repoPath,
      bubbleBranch,
      worktreePath
    });

    expect(result.removedWorktree).toBe(true);
    expect(result.removedBranch).toBe(true);
  });

  it("accepts detached clone HEAD ownership when the local and source bubble refs still match", async () => {
    const repoPath = await createGitRepo();
    const worktreePath = await createWorktreePath("b_clone_detached_owned");
    const bubbleBranch = "bubble/b_clone_detached_owned";

    await createCloneWorkspace({
      repoPath,
      worktreePath,
      bubbleBranch
    });
    await runGit(worktreePath, ["checkout", "--detach"]);

    const result = await cleanupWorktreeWorkspace({
      repoPath,
      bubbleBranch,
      worktreePath
    });

    expect(result.removedWorktree).toBe(true);
    expect(result.removedBranch).toBe(true);
  });
});
