import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { commitBubble, BubbleCommitError } from "../../../src/core/bubble/commitBubble.js";
import { emitApprove } from "../../../src/core/human/approval.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-commit-bubble-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupApprovedBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Finalize task"
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:00:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:02:00.000Z")
  });
  await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:03:00.000Z")
  });
  await emitApprove({
    bubbleId: bubble.bubbleId,
    cwd: repoPath,
    now: new Date("2026-02-22T15:04:00.000Z")
  });

  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("commitBubble", () => {
  it("requires APPROVED_FOR_COMMIT state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_commit_01",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });
    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath
    });

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(BubbleCommitError);
  });

  it("commits staged files, appends DONE_PACKAGE, and transitions to DONE", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_02");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nImplemented feature X with tests.\n",
      "utf8"
    );

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T15:10:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.commitSha.length).toBeGreaterThan(6);
    expect(result.stagedFiles).toEqual(["feature.txt"]);
    expect(result.envelope.type).toBe("DONE_PACKAGE");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("DONE");
    expect(loaded.state.active_agent).toBeNull();
    expect(loaded.state.active_role).toBeNull();

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("DONE_PACKAGE");

    const log = await runGit(bubble.paths.worktreePath, ["log", "-1", "--pretty=%s"]);
    expect(log.stdout.trim()).toBe("bubble(b_commit_02): finalize");
  });

  it("requires done-package artifact before commit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_03");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toThrow(/Missing done package artifact/u);
  });
});
