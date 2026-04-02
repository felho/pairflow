import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { resolveBubbleById } from "../../../src/core/bubble/bubbleLookup.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-lookup-"));
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
      worktreePath: bubble.paths.worktreePath
    });

    process.env.PAIRFLOW_WORKTREE_ROOT = bubble.paths.worktreePath;

    const resolved = await resolveBubbleById({
      bubbleId: bubble.config.id,
      cwd: outsideDir
    });

    expect(resolved.bubbleId).toBe("b_lookup_env_01");
    expect(resolved.repoPath).toBe(repoPath);
  });
});
