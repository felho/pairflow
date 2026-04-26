import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import type {
  BubbleConfig,
  BubbleRemotePointerStarted,
  BubbleStateSnapshot
} from "../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";
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
import { getBubblePaths } from "../../../src/v11/shared/bubble/bubblePaths.js";

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

function createRemoteBubbleConfig(repoPath: string, bubbleId: string): BubbleConfig {
  return {
    id: bubbleId,
    repo_path: repoPath,
    base_branch: "main",
    bubble_branch: `bubble/${bubbleId}`,
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: "code",
    pairflow_command_profile: "external",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 60,
    max_rounds: 5,
    severity_gate_round: 2,
    commit_requires_approval: true,
    agents: {
      implementer: "codex",
      reviewer: "claude",
      meta_reviewer: "codex"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: false
    },
    doc_contract_gates: {
      round_gate_applies_after: 2
    },
    executor: {
      type: "ssh",
      remote: "prod"
    }
  };
}

function createStartedRemotePointer(
  bubbleId: string
): BubbleRemotePointerStarted {
  return {
    kind: "started",
    host: "ssh.example.com",
    instanceId: `inst_${bubbleId}`,
    remoteClonePath: `/srv/pairflow/repo--${bubbleId}`,
    tmuxSession: `pf-${bubbleId}`,
    startedAt: "2026-04-18T08:15:00.000Z"
  };
}

function noRemoteCommitCompletionEvidence() {
  return vi.fn(async () => ({
    classification: "no_remote_completion_evidence" as const,
    reason: "remote completion not present"
  }));
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
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(BubbleCommitError);
  });

  it("commits staged files, appends COMMIT_RESULT, and transitions to DONE without done-package", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_02");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    const donePackagePath = join(bubble.paths.artifactsDir, "done-package.md");

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T15:10:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.commitSha.length).toBeGreaterThan(6);
    expect(result.stagedFiles).toEqual(["feature.txt"]);
    expect(result.envelope.type).toBe("COMMIT_RESULT");
    expect("donePackagePath" in result).toBe(false);
    expect(result.envelope.payload).toEqual({
      metadata: {
        commit_message: "bubble(b_commit_02): finalize",
        commit_sha: result.commitSha,
        staged_files: ["feature.txt"]
      }
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("DONE");
    expect(loaded.state.active_agent).toBeNull();
    expect(loaded.state.active_role).toBeNull();

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("COMMIT_RESULT");
    await expect(readFile(donePackagePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });

    const log = await runGit(bubble.paths.worktreePath, ["log", "-1", "--pretty=%s"]);
    expect(log.stdout.trim()).toBe("bubble(b_commit_02): finalize");
  });

  it("does not require done-package artifact before commit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_03");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(result.state.state).toBe("DONE");
    expect(result.envelope.type).toBe("COMMIT_RESULT");
  });

  it("supports stage-all commit flow without done-package generation", async () => {
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
      stageAll: true,
      now: new Date("2026-02-22T15:20:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.stagedFiles).toContain("feature-auto.txt");
    expect(result.envelope.type).toBe("COMMIT_RESULT");
    expect("donePackagePath" in result).toBe(false);

    await expect(
      readFile(join(bubble.paths.artifactsDir, "done-package.md"), "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps temporary auto compatibility as staging-only", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_04_compat");

    await writeFile(
      join(bubble.paths.worktreePath, "feature-compat.txt"),
      "compat behavior\n",
      "utf8"
    );

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      auto: true,
      now: new Date("2026-02-22T15:21:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.stagedFiles).toContain("feature-compat.txt");
    expect(result.envelope.type).toBe("COMMIT_RESULT");

    await expect(
      readFile(join(bubble.paths.artifactsDir, "done-package.md"), "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("lets explicit stageAll false override temporary auto compatibility", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_04_precedence");

    await writeFile(
      join(bubble.paths.worktreePath, "feature-precedence.txt"),
      "precedence behavior\n",
      "utf8"
    );

    try {
      await commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        stageAll: false,
        auto: true,
        now: new Date("2026-02-22T15:22:00.000Z")
      });
      throw new Error("Expected commit to fail with empty staged files.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/COMMIT_STAGED_FILES_EMPTY:.*--stage-all/u);
      expect(message).toContain('"stage_all":false');
      expect(message).not.toContain("auto_generate");
    }
  });

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

  it("keeps the public commit surface on the remote started authority with local continuity sync-back", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(repoPath, "b_commit_remote_public_01");
    const bubblePaths = getBubblePaths(repoPath, "b_commit_remote_public_01");
    const statePath = bubblePaths.statePath;
    const transcriptPath = bubblePaths.transcriptPath;
    const donePackagePath = join(bubblePaths.artifactsDir, "done-package.md");
    const remoteState: BubbleStateSnapshot = {
      bubble_id: "b_commit_remote_public_01",
      state: "DONE",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:20:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(
      statePath,
      `${JSON.stringify({
        ...remoteState,
        state: "APPROVED_FOR_COMMIT",
        last_command_at: "2026-04-18T08:19:00.000Z"
      } satisfies BubbleStateSnapshot, null, 2)}\n`,
      "utf8"
    );
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_commit_remote_public_01",
      ts: "2026-04-18T08:20:00.000Z",
      bubble_id: "b_commit_remote_public_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature-public.txt"],
          commit_message: "bubble(b_commit_remote_public_01): finalize",
          commit_sha: "fedcba9876543210"
        }
      },
      refs: []
    };

    const result = await commitBubble(
      {
        bubbleId: "b_commit_remote_public_01",
        cwd: repoPath,
        now: new Date("2026-04-18T08:20:00.000Z")
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubbleId: "b_commit_remote_public_01",
          repoPath,
          bubblePaths,
          bubbleConfig
        })),
        ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
          bubbleInstanceId: "bi_commit_remote_public_01",
          bubbleConfig,
          backfilled: false
        })),
        readRemotePointer: vi.fn(async () => createStartedRemotePointer("b_commit_remote_public_01")),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        })),
        importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
        executeRemoteBubbleCommitCommand: vi.fn(async () => ({
          bubbleId: "b_commit_remote_public_01",
          sequence: 5,
          envelope: remoteEnvelope,
          state: remoteState,
          stateContent: `${JSON.stringify(remoteState, null, 2)}\n`,
          transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
          commitSha: "fedcba9876543210",
          commitMessage: "bubble(b_commit_remote_public_01): finalize",
          stagedFiles: ["feature-public.txt"]
        })),
        appendProtocolEnvelope: vi.fn(async () => {
          throw new Error("unused");
        }),
        readStateSnapshot,
        readTranscriptEnvelopes: vi.fn(async () => []),
        runGit: vi.fn(async () => {
          throw new Error("runGit should not be used for remote public routing");
        }),
        writeTextFile: async (path: string, content: string) => {
          await writeFile(path, content, "utf8");
        },
        writeStateSnapshot: vi.fn(async () => {
          throw new Error("unused");
        })
      }
    );

    expect(result.commitSha).toBe("fedcba9876543210");
    await expect(readFile(donePackagePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });
    expect(await readFile(statePath, "utf8")).toContain("\"state\": \"DONE\"");
    expect(await readFile(transcriptPath, "utf8")).toContain("\"COMMIT_RESULT\"");
  });
});
