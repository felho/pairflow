import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  BubbleRemotePointerStarted
} from "../../../src/v11/shared/remote/remoteExecutionTypes.js";
import type { BubbleConfig } from "../../../src/v11/shared/config/bubbleConfigTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../src/v11/shared/protocol/protocolEnvelopeContract.js";
import {
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace
} from "../../../src/v11/application/converged/convergedCommandOrchestration.js";
import {
  emitPassFromWorkspace
} from "../../../src/v11/application/pass/passCommandOrchestration.js";
import {
  BubbleCommitError,
  commitBubble as commitBubbleCommand
} from "../../../src/v11/application/commit/commitCommandApi.js";
import { submitMetaReviewResult } from "../../../src/v11/defaults/metaReview/metaReviewApi.js";
import { emitApprove } from "../../../src/v11/application/approval/approvalCommandApi.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { commitBubbleDependencyDefaults } from "../../../src/v11/defaults/commit/commitCommandDefaults.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../helpers/stateSnapshot.js";
import { getBubblePaths } from "../../../src/v11/shared/bubble/bubblePaths.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
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

async function setupApprovedBubbleThroughLifecycle(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Finalize task",
    reviewPolicy: {
      meta_review_consecutive_clean_runs_required: 1
    }
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

  it("commits staged files with an accepted message, appends COMMIT_RESULT, and transitions to DONE without done-package", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubbleThroughLifecycle(repoPath, "b_commit_02");

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
      message: "feat(commit): finalize approved bubble",
      now: new Date("2026-02-22T15:10:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.commitSha.length).toBeGreaterThan(6);
    expect(result.stagedFiles).toEqual(["feature.txt"]);
    expect(result.envelope.type).toBe("COMMIT_RESULT");
    expect("donePackagePath" in result).toBe(false);
    expect(result.envelope.payload).toEqual({
      commit_message: "feat(commit): finalize approved bubble",
      commit_sha: result.commitSha,
      staged_files: ["feature.txt"]
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
    expect(log.stdout.trim()).toBe("feat(commit): finalize approved bubble");
  });

  it("fails before git commit when staged files have no explicit message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_message_required");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    const headBefore = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toThrow(/COMMIT_MESSAGE_REQUIRED/u);

    const headAfter = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();
    expect(headAfter).toBe(headBefore);
    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("APPROVED_FOR_COMMIT");
    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((envelope) => envelope.type === "COMMIT_RESULT")).toBe(false);
  });

  it("fails before staging changes when stageAll has no explicit message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_stage_all_message_required");

    await writeFile(
      join(bubble.paths.worktreePath, "feature-stage-all.txt"),
      "new behavior\n",
      "utf8"
    );

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        stageAll: true
      })
    ).rejects.toThrow(/COMMIT_MESSAGE_REQUIRED/u);

    const cachedFiles = (
      await runGit(bubble.paths.worktreePath, ["diff", "--cached", "--name-only"])
    ).stdout.trim();
    expect(cachedFiles).toBe("");
    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("APPROVED_FOR_COMMIT");
    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((envelope) => envelope.type === "COMMIT_RESULT")).toBe(false);
  });

  it("fails before git commit when staged files have a rejected explicit message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_message_rejected");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    const headBefore = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        message: `bubble(${bubble.bubbleId}): finalize`
      })
    ).rejects.toThrow(/COMMIT_MESSAGE_POLICY_REJECTED/u);

    const headAfter = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();
    expect(headAfter).toBe(headBefore);
    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("APPROVED_FOR_COMMIT");
    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((envelope) => envelope.type === "COMMIT_RESULT")).toBe(false);
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
      cwd: repoPath,
      message: "fix(commit): finalize without done package"
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
      message: "feat(commit): stage all changes",
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

  it("supports forced empty commits with an accepted explicit message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_empty_force");

    const result = await commitBubble({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      force: true,
      message: "chore(commit): record empty lifecycle checkpoint",
      now: new Date("2026-02-22T15:25:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.stagedFiles).toEqual([]);
    expect(result.envelope.type).toBe("COMMIT_RESULT");
    expect(result.envelope.payload).toEqual({
      commit_message: "chore(commit): record empty lifecycle checkpoint",
      commit_sha: result.commitSha,
      staged_files: []
    });

    const log = await runGit(bubble.paths.worktreePath, [
      "log",
      "-1",
      "--pretty=%s"
    ]);
    expect(log.stdout.trim()).toBe("chore(commit): record empty lifecycle checkpoint");
  });

  it("fails before forced empty commit when no explicit message is provided", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_empty_force_missing");
    const headBefore = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();

    await expect(
      commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true,
        now: new Date("2026-02-22T15:25:00.000Z")
      })
    ).rejects.toThrow(/COMMIT_MESSAGE_REQUIRED/u);

    const headAfter = (
      await runGit(bubble.paths.worktreePath, ["rev-parse", "HEAD"])
    ).stdout.trim();
    expect(headAfter).toBe(headBefore);
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
      message: "feat(commit): stage auto compatibility changes",
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

  it("keeps the public commit surface on the remote started authority with local continuity sync-back", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(repoPath, "b_commit_remote_public_01");
    const bubblePaths = getBubblePaths(repoPath, "b_commit_remote_public_01");
    const statePath = bubblePaths.statePath;
    const transcriptPath = bubblePaths.transcriptPath;
    const donePackagePath = join(bubblePaths.artifactsDir, "done-package.md");
    const remoteState: PersistedBubbleStateSnapshot = {
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
      } satisfies PersistedBubbleStateSnapshot, null, 2)}\n`,
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
        staged_files: ["feature-public.txt"],
        commit_message: "feat(remote): finalize public commit",
        commit_sha: "fedcba9876543210"
      },
      refs: []
    };

    const result = await commitBubble(
      {
        bubbleId: "b_commit_remote_public_01",
        cwd: repoPath,
        message: "feat(remote): finalize public commit",
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
          state: buildBubbleStateSnapshotVariant(remoteState),
          stateContent: `${JSON.stringify(remoteState, null, 2)}\n`,
          transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
          commitSha: "fedcba9876543210",
          commitMessage: "feat(remote): finalize public commit",
          stagedFiles: ["feature-public.txt"]
        })),
        appendProtocolEnvelope: vi.fn(async () => {
          throw new Error("unused");
        }),
        readStateSnapshot: readStateSnapshot,
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
