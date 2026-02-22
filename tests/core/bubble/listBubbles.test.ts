import { mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { BubbleListError, listBubbles } from "../../../src/core/bubble/listBubbles.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-bubble-list-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function createTempDir(prefix = "pairflow-bubble-list-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function normalizePath(path: string): Promise<string> {
  return realpath(path).catch(() => path);
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("listBubbles", () => {
  it("lists multi-bubble state summary and runtime session registry counts", async () => {
    const repoPath = await createTempRepo();

    const createdBubble = await createBubble({
      id: "b_list_01",
      repoPath,
      baseBranch: "main",
      task: "Created only",
      cwd: repoPath
    });
    const runningBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_list_02",
      task: "Running bubble"
    });

    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: runningBubble.bubbleId,
      repoPath,
      worktreePath: runningBubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_02",
      now: new Date("2026-02-22T18:00:00.000Z")
    });
    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: "b_stale_01",
      repoPath,
      worktreePath: "/tmp/nonexistent",
      tmuxSessionName: "pf-b_stale_01",
      now: new Date("2026-02-22T18:00:01.000Z")
    });

    const listed = await listBubbles({ repoPath });

    expect(listed.total).toBe(2);
    expect(listed.bubbles.map((item) => item.bubbleId)).toEqual([
      "b_list_01",
      "b_list_02"
    ]);
    expect(listed.byState.CREATED).toBe(1);
    expect(listed.byState.RUNNING).toBe(1);
    expect(listed.runtimeSessions.registered).toBe(1);
    expect(listed.runtimeSessions.stale).toBe(1);
    expect(listed.bubbles[1]?.runtimeSession?.tmuxSessionName).toBe("pf-b_list_02");
  });

  it("resolves repository from cwd when repoPath is omitted", async () => {
    const repoPath = await createTempRepo();
    await createBubble({
      id: "b_list_03",
      repoPath,
      baseBranch: "main",
      task: "Cwd lookup",
      cwd: repoPath
    });
    const nested = join(repoPath, "nested", "path");
    await mkdir(nested, { recursive: true });

    const listed = await listBubbles({ cwd: nested });
    expect(listed.repoPath).toBe(await normalizePath(repoPath));
    expect(listed.total).toBe(1);
  });

  it("rejects when cwd is not inside a git repository", async () => {
    const dir = await createTempDir();
    await expect(listBubbles({ cwd: dir })).rejects.toBeInstanceOf(BubbleListError);
  });

  it("counts runtime session on non-runtime state bubble as stale", async () => {
    const repoPath = await createTempRepo();
    const createdBubble = await createBubble({
      id: "b_list_04",
      repoPath,
      baseBranch: "main",
      task: "Created with stale session",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: createdBubble.paths.sessionsPath,
      bubbleId: createdBubble.bubbleId,
      repoPath,
      worktreePath: createdBubble.paths.worktreePath,
      tmuxSessionName: "pf-b_list_04",
      now: new Date("2026-02-22T18:30:00.000Z")
    });

    const listed = await listBubbles({ repoPath });
    expect(listed.total).toBe(1);
    expect(listed.byState.CREATED).toBe(1);
    expect(listed.runtimeSessions.registered).toBe(0);
    expect(listed.runtimeSessions.stale).toBe(1);
    expect(listed.bubbles[0]?.runtimeSession?.tmuxSessionName).toBe("pf-b_list_04");
  });
});
