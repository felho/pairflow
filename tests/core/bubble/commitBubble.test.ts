import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import {
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace
} from "../../../src/v11/application/converged/emitConvergedV11.js";
import {
  emitPassFromWorkspaceV11 as emitPassFromWorkspace
} from "../../../src/v11/application/pass/emitPassV11.js";
import {
  BubbleCommitErrorV11 as BubbleCommitError,
  commitBubbleV11
} from "../../../src/v11/application/commit/emitCommitV11.js";
import { submitMetaReviewResult } from "../../../src/v11/defaults/metaReview/metaReviewApi.js";
import { emitApproveV11 as emitApprove } from "../../../src/v11/application/approval/emitApprovalV11.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { commitBubbleDependencyDefaults } from "../../../src/v11/application/commit/commitCommandDefaults.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function commitBubble(
  input: Parameters<typeof commitBubbleV11>[0],
  dependencies: Parameters<typeof commitBubbleV11>[1] = commitBubbleDependencyDefaults
): Promise<Awaited<ReturnType<typeof commitBubbleV11>>> {
  return commitBubbleV11(input, dependencies);
}

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-commit-bubble-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

function buildActiveMetaReviewerSession(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
}) {
  return {
    [input.bubbleId]: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      tmuxSessionName: "pf_commit_bubble_fixture",
      updatedAt: "2026-02-22T15:03:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: true,
        updatedAt: "2026-02-22T15:03:00.000Z"
      }
    }
  };
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
  const converged = await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:03:00.000Z")
  });
  await submitMetaReviewResult(
    {
      bubbleId: bubble.bubbleId,
      repoPath,
      round: converged.state.round,
      recommendation: "approve",
      summary: "No findings remain after this review.",
      report_json: {
        findings_claim_state: "clean",
        findings_claim_source: "meta_review_artifact",
        findings_count: 0
      }
    },
    {
      now: new Date("2026-02-22T15:03:30.000Z"),
      readRuntimeSessionsRegistry: async () => {
        await Promise.resolve();
        return buildActiveMetaReviewerSession({
          bubbleId: bubble.bubbleId,
          repoPath,
          worktreePath: bubble.paths.worktreePath
        });
      }
    }
  );
  await emitApprove({
    bubbleId: bubble.bubbleId,
    cwd: repoPath,
    now: new Date("2026-02-22T15:04:00.000Z")
  });

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

describe("commitBubble", () => {
  it("requires APPROVED_FOR_COMMIT state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_commit_01",
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

  it("supports --auto style commit flow (auto stage + auto done-package)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_04");

    await writeFile(
      join(bubble.paths.worktreePath, "feature-auto.txt"),
      "auto behavior\n",
      "utf8"
    );

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      auto: true,
      now: new Date("2026-02-22T15:20:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.stagedFiles).toContain("feature-auto.txt");
    expect(result.donePackagePath).toBe(
      join(bubble.paths.artifactsDir, "done-package.md")
    );

    const donePackage = await readFile(result.donePackagePath, "utf8");
    expect(donePackage).toContain("Auto-generated by pairflow");
    expect(donePackage).toContain(`Bubble ID: ${bubble.bubbleId}`);
  });

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
        now: new Date("2026-02-22T15:25:00.000Z")
      })
    ).rejects.toThrow(/COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED/u);

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("APPROVED_FOR_COMMIT");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((envelope) => envelope.type === "DONE_PACKAGE")).toBe(false);
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
    expect(transcript.some((envelope) => envelope.type === "DONE_PACKAGE")).toBe(false);
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
          auto: true,
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
    expect(failedTranscript.some((envelope) => envelope.type === "DONE_PACKAGE")).toBe(false);

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
