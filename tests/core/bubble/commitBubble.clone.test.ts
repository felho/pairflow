import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import type { PersistedBubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import {
  commitBubble as commitBubbleCommand
} from "../../../src/v11/application/commit/commitCommandApi.js";
import { commitBubbleDependencyDefaults } from "../../../src/v11/defaults/commit/commitCommandDefaults.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../helpers/stateSnapshot.js";
const tempDirs: string[] = [];

async function commitBubble(
  input: Parameters<typeof commitBubbleCommand>[0],
  dependencies: Parameters<typeof commitBubbleCommand>[1] = commitBubbleDependencyDefaults
): Promise<Awaited<ReturnType<typeof commitBubbleCommand>>> {
  return commitBubbleCommand(input, dependencies);
}

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
    task: "Finalize task",
    reviewPolicy: {
      meta_review_consecutive_clean_runs_required: 1
    }
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const approvedAt = "2026-02-22T15:04:00.000Z";

  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      bubble_id: bubble.bubbleId,
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_role: null,
      active_since: null,
      execution_context: null,
      round_role_history: loaded.state.round_role_history,
      last_command_at: approvedAt,
      pending_rework_intent: null,
      rework_intent_history: []
    } satisfies PersistedBubbleStateSnapshot,
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );

  return bubble;
}

async function convertApprovedBubbleToClone(
  repoPath: string,
  bubble: Awaited<ReturnType<typeof setupApprovedBubble>>
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

describe("commitBubble clone mode", () => {
  // Clone-path fixtures keep legacy done-package files only to prove retained artifacts are ignored.
  it("fails closed when clone source branch sync fails after local commit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_sync_fail_01")
    );
    const donePackagePath = join(bubble.paths.artifactsDir, "done-package.md");
    const originalDonePackage = "# Done Package\n\nClone sync failure should not finalize.\n";

    await writeFile(join(bubble.paths.worktreePath, "feature.txt"), "clone change\n", "utf8");
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    await writeFile(donePackagePath, originalDonePackage, "utf8");

    await runGit(repoPath, ["checkout", bubble.config.bubble_branch]);
    await writeFile(join(repoPath, "source-only.txt"), "diverged\n", "utf8");
    await runGit(repoPath, ["add", "source-only.txt"]);
    await runGit(repoPath, ["commit", "-m", "feat(source): diverge clone branch"]);
    await runGit(repoPath, ["checkout", "main"]);

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        message: "feat(clone): sync local clone change",
        now: new Date("2026-02-22T15:25:00.000Z")
      })
    ).rejects.toThrow(/COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED/u);

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("APPROVED_FOR_COMMIT");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((envelope) => envelope.type === "COMMIT_RESULT")).toBe(false);
    expect(await readFile(donePackagePath, "utf8")).toBe(originalDonePackage);
  });

  it("commits, syncs, and finalizes a fresh clone change in one call", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_happy_path_01")
    );

    await writeFile(
      join(bubble.paths.worktreePath, "feature-happy.txt"),
      "fresh clone happy path\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature-happy.txt"]);
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nFresh clone sync should finalize in one call.\n",
      "utf8"
    );

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      message: "feat(clone): finalize fresh clone change",
      now: new Date("2026-02-22T15:27:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.stagedFiles).toEqual(["feature-happy.txt"]);

    const sourceBranchSha = (
      await runGit(repoPath, ["rev-parse", `refs/heads/${bubble.config.bubble_branch}`])
    ).stdout.trim();
    expect(sourceBranchSha).toBe(result.commitSha);
  });

  it("retries clone commit by syncing the existing local HEAD without creating a new commit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_retry_01")
    );
    const commitMessage = "feat(clone): local retry commit";

    await writeFile(join(bubble.paths.worktreePath, "feature-retry.txt"), "retry\n", "utf8");
    await runGit(bubble.paths.worktreePath, ["add", "feature-retry.txt"]);
    await runGit(bubble.paths.worktreePath, ["commit", "-m", commitMessage]);
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nRetry should sync retained clone HEAD.\n",
      "utf8"
    );
    const commitCountBeforeRetry = Number.parseInt(
      (await runGit(bubble.paths.worktreePath, ["rev-list", "--count", "HEAD"])).stdout.trim(),
      10
    );

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T15:30:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.commitMessage).toBe(commitMessage);
    expect(result.stagedFiles).toContain("feature-retry.txt");

    const sourceBranchSha = (
      await runGit(repoPath, ["rev-parse", `refs/heads/${bubble.config.bubble_branch}`])
    ).stdout.trim();
    expect(sourceBranchSha).toBe(result.commitSha);
    const commitCountAfterRetry = Number.parseInt(
      (await runGit(bubble.paths.worktreePath, ["rev-list", "--count", "HEAD"])).stdout.trim(),
      10
    );
    expect(commitCountAfterRetry).toBe(commitCountBeforeRetry);
  });

  it("retries clone finalization from a retained merge commit with non-empty changed files", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_merge_retry_01")
    );

    await runGit(bubble.paths.worktreePath, ["checkout", "-b", "side-change"]);
    await writeFile(
      join(bubble.paths.worktreePath, "side-change.txt"),
      "side branch change\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "side-change.txt"]);
    await runGit(bubble.paths.worktreePath, ["commit", "-m", "feat(clone): side change"]);
    await runGit(bubble.paths.worktreePath, ["checkout", bubble.config.bubble_branch]);
    await writeFile(
      join(bubble.paths.worktreePath, "mainline-change.txt"),
      "mainline branch change\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "mainline-change.txt"]);
    await runGit(bubble.paths.worktreePath, ["commit", "-m", "feat(clone): mainline change"]);
    await runGit(bubble.paths.worktreePath, ["merge", "--no-ff", "side-change", "-m", "feat(clone): merge side change"]);

    const mergeSha = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T15:31:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.commitSha).toBe(mergeSha);
    expect(result.envelope.type).toBe("COMMIT_RESULT");
    expect(result.stagedFiles).toEqual(
      expect.arrayContaining(["mainline-change.txt", "side-change.txt"])
    );
  });

  it("fails closed for clone retry when the source branch diverged from the retained local HEAD", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_diverged_01")
    );
    const donePackagePath = join(bubble.paths.artifactsDir, "done-package.md");

    await writeFile(join(bubble.paths.worktreePath, "feature-diverged.txt"), "local head\n", "utf8");
    await runGit(bubble.paths.worktreePath, ["add", "feature-diverged.txt"]);
    await runGit(bubble.paths.worktreePath, ["commit", "-m", "feat(clone): retained local head"]);
    await writeFile(
      donePackagePath,
      "# Done Package\n\nDiverged clone retry should fail closed.\n",
      "utf8"
    );

    await runGit(repoPath, ["checkout", bubble.config.bubble_branch]);
    await writeFile(join(repoPath, "source-diverged.txt"), "source head\n", "utf8");
    await runGit(repoPath, ["add", "source-diverged.txt"]);
    await runGit(repoPath, ["commit", "-m", "feat(source): diverged branch"]);
    await runGit(repoPath, ["checkout", "main"]);

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T15:35:00.000Z")
      })
    ).rejects.toThrow(/COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED/u);

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("APPROVED_FOR_COMMIT");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((envelope) => envelope.type === "COMMIT_RESULT")).toBe(false);
    expect(await readFile(donePackagePath, "utf8")).toContain("Diverged clone retry");
  });

  it("retries clone finalization after source sync already succeeded but append failed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_post_sync_retry_01")
    );
    const customCommitMessage = "feat(clone): custom synced retry";

    await writeFile(
      join(bubble.paths.worktreePath, "feature-post-sync.txt"),
      "post sync retry\n",
      "utf8"
    );
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nRetry after synced append failure.\n",
      "utf8"
    );

    let appendAttempts = 0;
    await expect(
      commitBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          stageAll: true,
          message: customCommitMessage,
          now: new Date("2026-02-22T15:40:00.000Z")
        },
        {
          ...commitBubbleDependencyDefaults,
          appendProtocolEnvelope: async (...args) => {
            appendAttempts += 1;
            if (appendAttempts === 1) {
              throw new Error("simulated append failure after sync");
            }
            return commitBubbleDependencyDefaults.appendProtocolEnvelope(...args);
          }
        }
      )
    ).rejects.toThrow(/simulated append failure after sync/u);

    const failedState = await readStateSnapshot(bubble.paths.statePath);
    expect(failedState.state.state).toBe("APPROVED_FOR_COMMIT");
    const failedTranscript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(failedTranscript.some((envelope) => envelope.type === "COMMIT_RESULT")).toBe(false);

    const syncedSourceBranchSha = (
      await runGit(repoPath, ["rev-parse", `refs/heads/${bubble.config.bubble_branch}`])
    ).stdout.trim();
    const syncedCloneHeadSha = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();
    expect(syncedSourceBranchSha).toBe(syncedCloneHeadSha);

    const retryResult = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      message: customCommitMessage,
      now: new Date("2026-02-22T15:41:00.000Z")
    });

    expect(retryResult.state.state).toBe("DONE");
    expect(retryResult.commitMessage).toBe(customCommitMessage);
    expect(retryResult.commitSha).toBe(syncedCloneHeadSha);
    expect(retryResult.stagedFiles).toContain("feature-post-sync.txt");
    expect(await readFile(join(bubble.paths.artifactsDir, "done-package.md"), "utf8")).toBe(
      "# Done Package\n\nRetry after synced append failure.\n"
    );
  });

  it("fails closed with clone source sync error when the source branch is missing but the retained clone HEAD moved beyond base", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_missing_source_01")
    );

    await writeFile(
      join(bubble.paths.worktreePath, "feature-missing-source.txt"),
      "missing source branch retry\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature-missing-source.txt"]);
    await runGit(
      bubble.paths.worktreePath,
      ["commit", "-m", "feat(clone): retained head past base"]
    );
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nMissing source branch retry should fail closed.\n",
      "utf8"
    );
    await runGit(repoPath, ["branch", "-D", bubble.config.bubble_branch]);

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T15:41:30.000Z")
      })
    ).rejects.toThrow(/COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED/u);
  });

  it("returns clone source sync error instead of staged-files-empty when retry runs from the wrong branch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertApprovedBubbleToClone(
      repoPath,
      await setupApprovedBubble(repoPath, "b_commit_clone_wrong_branch_01")
    );

    await writeFile(
      join(bubble.paths.worktreePath, "feature-wrong-branch.txt"),
      "wrong branch retry\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature-wrong-branch.txt"]);
    await runGit(
      bubble.paths.worktreePath,
      ["commit", "-m", `bubble(${bubble.bubbleId}): finalize`]
    );
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nWrong branch retry should stay explicit.\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["checkout", "main"]);

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T15:42:00.000Z")
      })
    ).rejects.toThrow(/COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED/u);
  });
});
