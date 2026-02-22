import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { BubbleLookupError, resolveBubbleById } from "../../../src/core/bubble/bubbleLookup.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-lookup-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("resolveBubbleById", () => {
  it("resolves by explicit repo path", async () => {
    const repoPath = await createTempRepo();
    await createBubble({
      id: "b_lookup_01",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });

    const resolved = await resolveBubbleById({
      bubbleId: "b_lookup_01",
      repoPath
    });

    expect(resolved.bubbleId).toBe("b_lookup_01");
    expect(resolved.repoPath).toBe(repoPath);
  });

  it("resolves by cwd ancestry search when repo is omitted", async () => {
    const repoPath = await createTempRepo();
    await createBubble({
      id: "b_lookup_02",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });

    const nested = join(repoPath, "packages", "app");
    await mkdir(nested, { recursive: true });

    const resolved = await resolveBubbleById({
      bubbleId: "b_lookup_02",
      cwd: nested
    });

    expect(resolved.bubbleId).toBe("b_lookup_02");
  });

  it("rejects missing bubbles", async () => {
    const repoPath = await createTempRepo();

    await expect(
      resolveBubbleById({
        bubbleId: "b_missing",
        repoPath
      })
    ).rejects.toBeInstanceOf(BubbleLookupError);
  });

  it("accepts repo path aliases via realpath normalization", async () => {
    const repoPath = await createTempRepo();
    await createBubble({
      id: "b_lookup_03",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });

    const aliasRoot = await mkdtemp(join(tmpdir(), "pairflow-bubble-lookup-alias-"));
    tempDirs.push(aliasRoot);
    const repoAliasPath = join(aliasRoot, "repo-alias");
    await symlink(repoPath, repoAliasPath);

    const resolved = await resolveBubbleById({
      bubbleId: "b_lookup_03",
      repoPath: repoAliasPath
    });

    expect(resolved.bubbleId).toBe("b_lookup_03");
    expect(resolved.repoPath).toBe(repoPath);
  });
});
