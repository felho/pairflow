import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../../../src/config/bubbleConfig.js";
import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../../../src/v11/shared/remote/remoteExecutionTypes.js";
import type { BubbleConfig } from "../../../../src/v11/shared/config/bubbleConfigTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";
import {
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace
} from "../../../../src/v11/application/converged/convergedCommandOrchestration.js";
import { emitPassFromWorkspace } from "../../../../src/v11/application/pass/passCommandOrchestration.js";
import { submitMetaReviewResult } from "../../../../src/v11/defaults/metaReview/metaReviewApi.js";
import { emitApprove } from "../../../../src/v11/application/approval/approvalCommandApi.js";
import { commitBubble } from "../../../../src/v11/application/commit/commitCommandApi.js";
import {
  remoteCommitModeEnvVar,
  remoteCommitModeInnerRemoteExecution,
  remoteCommitWorkspaceRootEnvVar
} from "../../../../src/v11/application/commit/internal/remote/remoteCommitExecutionContext.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { adaptPersistedReadPortToDomain } from "../../../../src/v11/shared/mutation/mutationBoundaryIO.js";
import { readTranscriptEnvelopes } from "../../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { RemoteBubbleCommitCommandError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";
import { resolveMetricsShardPath } from "../../../../src/v11/shared/metrics/events.js";
import { buildCommitBubbleDependencies } from "../../../helpers/commit.js";
import { initGitRepository, runGit } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { getBubblePaths } from "../../../../src/v11/shared/bubble/bubblePaths.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-commit-v11-"));
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
    startedAt: "2026-04-18T08:00:00.000Z"
  };
}

function createCreatedRemotePointer(): BubbleRemotePointerCreated {
  return {
    kind: "created",
    host: "ssh.example.com"
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
      tmuxSessionName: "pf_commit_v11_fixture",
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

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("commitCommandApi", () => {
  it("commits staged files and transitions bubble to DONE", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_v11_01");

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
    }, buildCommitBubbleDependencies());

    expect(result.state.state).toBe("DONE");
    expect(result.commitSha.length).toBeGreaterThan(6);
    expect(result.stagedFiles).toEqual(["feature.txt"]);
    expect(result.envelope.type).toBe("COMMIT_RESULT");
    expect("donePackagePath" in result).toBe(false);
    expect(result.envelope.payload).toEqual({
      metadata: {
        commit_message: "bubble(b_commit_v11_01): finalize",
        commit_sha: result.commitSha,
        staged_files: ["feature.txt"]
      }
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("DONE");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("COMMIT_RESULT");
    await expect(readFile(donePackagePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });

    const metricsShard = resolveMetricsShardPath({
      at: new Date("2026-02-22T15:10:00.000Z")
    });
    const commitEvent = (await readFile(metricsShard.filePath, "utf8"))
      .trim()
      .split(/\n/u)
      .map((line) => JSON.parse(line) as {
        bubble_id?: string;
        event_type?: string;
        metadata?: Record<string, unknown>;
      })
      .find((event) =>
        event.bubble_id === bubble.bubbleId &&
        event.event_type === "bubble_committed"
      );
    expect(commitEvent?.metadata).toEqual({
      auto: false,
      commit_message: "bubble(b_commit_v11_01): finalize",
      commit_sha: result.commitSha,
      refs_count: 0,
      staged_file_count: 1
    });
  });

  it("routes started remote commits through the remote authority and syncs local continuity artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(repoPath, "b_remote_commit_01");
    const bubblePaths = getBubblePaths(repoPath, "b_remote_commit_01");
    const statePath = bubblePaths.statePath;
    const transcriptPath = bubblePaths.transcriptPath;
    const donePackagePath = join(bubblePaths.artifactsDir, "done-package.md");
    const remoteState: PersistedBubbleStateSnapshot = {
      bubble_id: "b_remote_commit_01",
      state: "DONE",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:05:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    const localApprovedState: PersistedBubbleStateSnapshot = {
      ...remoteState,
      state: "APPROVED_FOR_COMMIT",
      last_command_at: "2026-04-18T08:04:00.000Z"
    };
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(
      statePath,
      `${JSON.stringify(localApprovedState, null, 2)}\n`,
      "utf8"
    );
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_remote_commit_01",
      ts: "2026-04-18T08:05:00.000Z",
      bubble_id: "b_remote_commit_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature-remote.txt"],
          commit_message: "bubble(b_remote_commit_01): finalize",
          commit_sha: "abcdef1234567890"
        }
      },
      refs: [
        "/srv/pairflow/repo/.pairflow/evidence/typecheck.log"
      ]
    };
    const executeRemoteBubbleCommitCommand = vi.fn(async () => ({
      bubbleId: "b_remote_commit_01",
      sequence: 7,
      envelope: remoteEnvelope,
      state: remoteState,
      stateContent: `${JSON.stringify(remoteState, null, 2)}\n`,
      transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
      commitSha: "abcdef1234567890",
      commitMessage: "bubble(b_remote_commit_01): finalize",
      stagedFiles: ["feature-remote.txt"]
    }));
    const runGit = vi.fn(async () => {
      throw new Error("runGit should not be used for remote commit routing");
    });
    const appendProtocolEnvelope = vi.fn(async () => {
      throw new Error("appendProtocolEnvelope should not be used for remote commit routing");
    });
    const writeStateSnapshot = vi.fn(async () => {
      throw new Error("writeStateSnapshot should not be used for remote commit routing");
    });

    const result = await commitBubble(
      {
        bubbleId: "b_remote_commit_01",
        cwd: repoPath,
        refs: [".pairflow/evidence/typecheck.log"],
        stageAll: true,
        now: new Date("2026-04-18T08:05:00.000Z")
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubbleId: "b_remote_commit_01",
          repoPath,
          bubblePaths,
          bubbleConfig
        })),
        ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
          bubbleInstanceId: "bi_remote_commit_01",
          bubbleConfig,
          backfilled: false
        })),
        readRemotePointer: vi.fn(async () => createStartedRemotePointer("b_remote_commit_01")),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        })),
        importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
        executeRemoteBubbleCommitCommand,
        appendProtocolEnvelope,
        readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
        readTranscriptEnvelopes: vi.fn(async () => []),
        runGit,
        writeTextFile: async (path: string, content: string) => {
          await writeFile(path, content, "utf8");
        },
        writeStateSnapshot
      }
    );

    expect(result).toMatchObject({
      bubbleId: "b_remote_commit_01",
      sequence: 7,
      state: {
        state: "DONE"
      },
      commitSha: "abcdef1234567890",
      stagedFiles: ["feature-remote.txt"]
    });
    expect(await readFile(statePath, "utf8")).toBe(
      `${JSON.stringify(remoteState, null, 2)}\n`
    );
    expect(await readFile(transcriptPath, "utf8")).toBe(
      `${JSON.stringify(remoteEnvelope)}\n`
    );
    await expect(readFile(donePackagePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });
    const metricsShard = resolveMetricsShardPath({
      at: new Date("2026-04-18T08:05:00.000Z")
    });
    const commitEvent = (await readFile(metricsShard.filePath, "utf8"))
      .trim()
      .split(/\n/u)
      .map((line) => JSON.parse(line) as {
        bubble_id?: string;
        event_type?: string;
        metadata?: Record<string, unknown>;
      })
      .find((event) =>
        event.bubble_id === "b_remote_commit_01" &&
        event.event_type === "bubble_committed"
      );
    expect(commitEvent?.metadata).toEqual({
      auto: true,
      commit_message: "bubble(b_remote_commit_01): finalize",
      commit_sha: "abcdef1234567890",
      refs_count: 1,
      staged_file_count: 1
    });
    expect(executeRemoteBubbleCommitCommand).toHaveBeenCalledWith({
      bubbleId: "b_remote_commit_01",
      refs: [".pairflow/evidence/typecheck.log"],
      remoteClonePath: "/srv/pairflow/repo--b_remote_commit_01",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      stageAll: true
    });
    expect(runGit).not.toHaveBeenCalled();
    expect(appendProtocolEnvelope).not.toHaveBeenCalled();
    expect(writeStateSnapshot).not.toHaveBeenCalled();
  });

  it("fails closed when remote commit requires a started pointer", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(repoPath, "b_remote_commit_created_01");
    const bubblePaths = getBubblePaths(repoPath, "b_remote_commit_created_01");
    const executeRemoteBubbleCommitCommand = vi.fn();

    await expect(
      commitBubble(
        {
          bubbleId: "b_remote_commit_created_01",
          cwd: repoPath,
          now: new Date("2026-04-18T08:10:00.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId: "b_remote_commit_created_01",
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_created_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createCreatedRemotePointer()),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          }),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async () => undefined),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(executeRemoteBubbleCommitCommand).not.toHaveBeenCalled();
  });

  it("fails closed when remote commit has no remote pointer yet", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(repoPath, "b_remote_commit_missing_01");
    const bubblePaths = getBubblePaths(repoPath, "b_remote_commit_missing_01");
    const executeRemoteBubbleCommitCommand = vi.fn();

    await expect(
      commitBubble(
        {
          bubbleId: "b_remote_commit_missing_01",
          cwd: repoPath,
          now: new Date("2026-04-18T08:10:30.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId: "b_remote_commit_missing_01",
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_missing_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => null),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          }),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async () => undefined),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(executeRemoteBubbleCommitCommand).not.toHaveBeenCalled();
  });

  it("uses the local canonical commit path inside a verified remote clone execution context", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(
      repoPath,
      "b_remote_commit_inner_local_01"
    );

    await writeFile(
      bubble.paths.bubbleTomlPath,
      `${renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      })}\n`,
      "utf8"
    );
    await writeFile(
      join(bubble.paths.worktreePath, "feature-inner-remote.txt"),
      "remote clone canonical local commit\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature-inner-remote.txt"]);

    vi.stubEnv(remoteCommitModeEnvVar, remoteCommitModeInnerRemoteExecution);
    vi.stubEnv(remoteCommitWorkspaceRootEnvVar, repoPath);

    try {
      const result = await commitBubble(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          now: new Date("2026-04-18T08:18:00.000Z")
        },
        buildCommitBubbleDependencies()
      );

      expect(result.state.state).toBe("DONE");
      expect(result.stagedFiles).toEqual(["feature-inner-remote.txt"]);
      expect(result.envelope.type).toBe("COMMIT_RESULT");
      expect("donePackagePath" in result).toBe(false);
      await expect(
        readFile(join(bubble.paths.artifactsDir, "done-package.md"), "utf8")
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("fails closed when remote commit returns an invalid payload", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(repoPath, "b_remote_commit_payload_01");
    const bubblePaths = getBubblePaths(repoPath, "b_remote_commit_payload_01");
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: "b_remote_commit_payload_01",
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:10:45.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(bubblePaths.statePath), { recursive: true });
    await writeFile(
      bubblePaths.statePath,
      `${JSON.stringify(approvedState, null, 2)}\n`,
      "utf8"
    );
    const executeRemoteBubbleCommitCommand = vi.fn(async () => {
      throw new RemoteBubbleCommitCommandError({
        code: "REMOTE_COMMIT_PAYLOAD_INVALID",
        message: "Remote commit returned malformed payload."
      });
    });
    const runGit = vi.fn(async () => {
      throw new Error("runGit should not be used for remote commit routing");
    });

    await expect(
      commitBubble(
        {
          bubbleId: "b_remote_commit_payload_01",
          cwd: repoPath,
          now: new Date("2026-04-18T08:11:00.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId: "b_remote_commit_payload_01",
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_payload_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createStartedRemotePointer("b_remote_commit_payload_01")),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit,
          writeTextFile: vi.fn(async () => undefined),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "REMOTE_COMMIT_PAYLOAD_INVALID"
    });

    expect(executeRemoteBubbleCommitCommand).toHaveBeenCalledOnce();
    expect(runGit).not.toHaveBeenCalled();
  });

  it("wraps remote continuity import transport failure without invoking the remote producer", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_remote_commit_import_unavailable_01";
    const bubbleConfig = createRemoteBubbleConfig(repoPath, bubbleId);
    const bubblePaths = getBubblePaths(repoPath, bubbleId);
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: bubbleId,
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:11:20.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(bubblePaths.statePath), { recursive: true });
    await writeFile(
      bubblePaths.statePath,
      `${JSON.stringify(approvedState, null, 2)}\n`,
      "utf8"
    );
    const executeRemoteBubbleCommitCommand = vi.fn(async () => {
      throw new Error("remote commit producer must not run after import failure");
    });

    await expect(
      commitBubble(
        {
          bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-18T08:11:30.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId,
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_import_unavailable_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createStartedRemotePointer(bubbleId)),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: vi.fn(async () => {
            throw new RemoteBubbleCommitCommandError({
              code: "REMOTE_COMMIT_TRANSPORT_FAILED",
              message: "ssh unavailable"
            });
          }),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async () => undefined),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE"
    });

    expect(executeRemoteBubbleCommitCommand).not.toHaveBeenCalled();
  });

  it("wraps invalid remote continuity evidence without invoking the remote producer", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_remote_commit_import_invalid_01";
    const bubbleConfig = createRemoteBubbleConfig(repoPath, bubbleId);
    const bubblePaths = getBubblePaths(repoPath, bubbleId);
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: bubbleId,
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:11:35.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(bubblePaths.statePath), { recursive: true });
    await writeFile(
      bubblePaths.statePath,
      `${JSON.stringify(approvedState, null, 2)}\n`,
      "utf8"
    );
    const executeRemoteBubbleCommitCommand = vi.fn(async () => {
      throw new Error("remote commit producer must not run after invalid import proof");
    });

    await expect(
      commitBubble(
        {
          bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-18T08:11:45.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId,
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_import_invalid_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createStartedRemotePointer(bubbleId)),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: vi.fn(async () => {
            throw new RemoteBubbleCommitCommandError({
              code: "REMOTE_COMMIT_PAYLOAD_INVALID",
              message: "metadata mismatch"
            });
          }),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async () => undefined),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID"
    });

    expect(executeRemoteBubbleCommitCommand).not.toHaveBeenCalled();
  });

  it("does not invoke the remote producer when no remote evidence exists and local state is not commit-eligible", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_remote_commit_no_evidence_done_01";
    const bubbleConfig = createRemoteBubbleConfig(repoPath, bubbleId);
    const bubblePaths = getBubblePaths(repoPath, bubbleId);
    const doneState: PersistedBubbleStateSnapshot = {
      bubble_id: bubbleId,
      state: "DONE",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:12:10.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(bubblePaths.statePath), { recursive: true });
    await writeFile(
      bubblePaths.statePath,
      `${JSON.stringify(doneState, null, 2)}\n`,
      "utf8"
    );
    const executeRemoteBubbleCommitCommand = vi.fn(async () => {
      throw new Error("remote commit producer must not run when local state is DONE");
    });

    await expect(
      commitBubble(
        {
          bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-18T08:12:15.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId,
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_no_evidence_done_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createStartedRemotePointer(bubbleId)),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async () => undefined),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toThrow(/APPROVED_FOR_COMMIT.*current: DONE/u);

    expect(executeRemoteBubbleCommitCommand).not.toHaveBeenCalled();
    expect(await readFile(bubblePaths.statePath, "utf8")).toBe(
      `${JSON.stringify(doneState, null, 2)}\n`
    );
  });

  it("fails closed when local continuity sync-back breaks after remote commit success", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(
      repoPath,
      "b_remote_commit_sync_fail_01"
    );
    const bubblePaths = getBubblePaths(repoPath, "b_remote_commit_sync_fail_01");
    const statePath = bubblePaths.statePath;
    const transcriptPath = bubblePaths.transcriptPath;
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: "b_remote_commit_sync_fail_01",
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:12:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(statePath, `${JSON.stringify(approvedState, null, 2)}\n`, "utf8");
    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        id: "msg_previous_remote_commit_sync_fail_01",
        ts: "2026-04-18T08:11:00.000Z",
        bubble_id: "b_remote_commit_sync_fail_01",
        sender: "orchestrator",
        recipient: "human",
        type: "PASS",
        round: 2,
        payload: {
          summary: "Previous local continuity state."
        },
        refs: []
      } satisfies ProtocolEnvelope)}\n`,
      "utf8"
    );
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_remote_commit_sync_fail_01",
      ts: "2026-04-18T08:13:00.000Z",
      bubble_id: "b_remote_commit_sync_fail_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_remote_commit_sync_fail_01): finalize",
          commit_sha: "1234567"
        }
      },
      refs: []
    };
    const remoteDoneState: PersistedBubbleStateSnapshot = {
      ...approvedState,
      state: "DONE",
      last_command_at: "2026-04-18T08:13:00.000Z"
    };
    const executeRemoteBubbleCommitCommand = vi.fn(async () => ({
      bubbleId: "b_remote_commit_sync_fail_01",
      sequence: 4,
      envelope: remoteEnvelope,
      state: remoteDoneState,
      stateContent: `${JSON.stringify(remoteDoneState, null, 2)}\n`,
      transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
      commitSha: "1234567",
      commitMessage: "bubble(b_remote_commit_sync_fail_01): finalize",
      stagedFiles: ["feature.txt"]
    }));

    await expect(
      commitBubble(
        {
          bubbleId: "b_remote_commit_sync_fail_01",
          cwd: repoPath,
          now: new Date("2026-04-18T08:13:00.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId: "b_remote_commit_sync_fail_01",
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_sync_fail_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createStartedRemotePointer("b_remote_commit_sync_fail_01")),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async (path: string, content: string) => {
            if (content === `${JSON.stringify(remoteEnvelope)}\n`) {
              throw new Error("simulated transcript sync failure");
            }
            await writeFile(path, content, "utf8");
          }),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toThrow(/REMOTE_COMMIT_SYNC_BACK_FAILED/u);

    expect(await readFile(statePath, "utf8")).toBe(
      `${JSON.stringify(approvedState, null, 2)}\n`
    );
    expect(await readFile(transcriptPath, "utf8")).toContain(
      "\"msg_previous_remote_commit_sync_fail_01\""
    );
  });

  it("rolls back previously applied local continuity artifacts when a later rename apply fails", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(
      repoPath,
      "b_remote_commit_sync_rename_fail_01"
    );
    const bubblePaths = getBubblePaths(repoPath, "b_remote_commit_sync_rename_fail_01");
    const statePath = bubblePaths.statePath;
    const transcriptPath = bubblePaths.transcriptPath;
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: "b_remote_commit_sync_rename_fail_01",
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:14:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(statePath, `${JSON.stringify(approvedState, null, 2)}\n`, "utf8");
    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        id: "msg_previous_remote_commit_sync_rename_fail_01",
        ts: "2026-04-18T08:13:00.000Z",
        bubble_id: "b_remote_commit_sync_rename_fail_01",
        sender: "orchestrator",
        recipient: "human",
        type: "PASS",
        round: 2,
        payload: {
          summary: "Previous local continuity state."
        },
        refs: []
      } satisfies ProtocolEnvelope)}\n`,
      "utf8"
    );
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_remote_commit_sync_rename_fail_01",
      ts: "2026-04-18T08:15:00.000Z",
      bubble_id: "b_remote_commit_sync_rename_fail_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_remote_commit_sync_rename_fail_01): finalize",
          commit_sha: "2345678"
        }
      },
      refs: []
    };
    const remoteDoneState: PersistedBubbleStateSnapshot = {
      ...approvedState,
      state: "DONE",
      last_command_at: "2026-04-18T08:15:00.000Z"
    };
    const executeRemoteBubbleCommitCommand = vi.fn(async () => ({
      bubbleId: "b_remote_commit_sync_rename_fail_01",
      sequence: 5,
      envelope: remoteEnvelope,
      state: remoteDoneState,
      stateContent: `${JSON.stringify(remoteDoneState, null, 2)}\n`,
      transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
      commitSha: "2345678",
      commitMessage: "bubble(b_remote_commit_sync_rename_fail_01): finalize",
      stagedFiles: ["feature.txt"]
    }));
    const renamePath = vi.fn(async (fromPath: string, toPath: string) => {
      if (
        fromPath.includes(".pairflow-sync-") &&
        fromPath.endsWith(".tmp") &&
        toPath === transcriptPath
      ) {
        throw new Error("simulated transcript rename apply failure");
      }
      await rename(fromPath, toPath);
    });

    await expect(
      commitBubble(
        {
          bubbleId: "b_remote_commit_sync_rename_fail_01",
          cwd: repoPath,
          now: new Date("2026-04-18T08:15:00.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId: "b_remote_commit_sync_rename_fail_01",
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_sync_rename_fail_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () => createStartedRemotePointer("b_remote_commit_sync_rename_fail_01")),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          renamePath,
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async (path: string, content: string) => {
            await writeFile(path, content, "utf8");
          }),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toThrow(/REMOTE_COMMIT_SYNC_BACK_FAILED/u);

    expect(await readFile(statePath, "utf8")).toBe(
      `${JSON.stringify(approvedState, null, 2)}\n`
    );
    expect(await readFile(transcriptPath, "utf8")).toContain(
      "\"msg_previous_remote_commit_sync_rename_fail_01\""
    );
    expect(renamePath).toHaveBeenCalled();
  });

  it("retries backup restoration before leaving sync-back cleanup residue", async () => {
    const repoPath = await createTempRepo();
    const bubbleConfig = createRemoteBubbleConfig(
      repoPath,
      "b_remote_commit_sync_restore_retry_01"
    );
    const bubblePaths = getBubblePaths(
      repoPath,
      "b_remote_commit_sync_restore_retry_01"
    );
    const statePath = bubblePaths.statePath;
    const transcriptPath = bubblePaths.transcriptPath;
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: "b_remote_commit_sync_restore_retry_01",
      state: "APPROVED_FOR_COMMIT",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:16:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(statePath, `${JSON.stringify(approvedState, null, 2)}\n`, "utf8");
    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        id: "msg_previous_remote_commit_sync_restore_retry_01",
        ts: "2026-04-18T08:15:00.000Z",
        bubble_id: "b_remote_commit_sync_restore_retry_01",
        sender: "orchestrator",
        recipient: "human",
        type: "PASS",
        round: 2,
        payload: {
          summary: "Previous local continuity state."
        },
        refs: []
      } satisfies ProtocolEnvelope)}\n`,
      "utf8"
    );
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_remote_commit_sync_restore_retry_01",
      ts: "2026-04-18T08:17:00.000Z",
      bubble_id: "b_remote_commit_sync_restore_retry_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_remote_commit_sync_restore_retry_01): finalize",
          commit_sha: "3456789"
        }
      },
      refs: []
    };
    const remoteDoneState: PersistedBubbleStateSnapshot = {
      ...approvedState,
      state: "DONE",
      last_command_at: "2026-04-18T08:17:00.000Z"
    };
    const executeRemoteBubbleCommitCommand = vi.fn(async () => ({
      bubbleId: "b_remote_commit_sync_restore_retry_01",
      sequence: 6,
      envelope: remoteEnvelope,
      state: remoteDoneState,
      stateContent: `${JSON.stringify(remoteDoneState, null, 2)}\n`,
      transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
      commitSha: "3456789",
      commitMessage: "bubble(b_remote_commit_sync_restore_retry_01): finalize",
      stagedFiles: ["feature.txt"]
    }));
    let transcriptRestoreAttempts = 0;
    const renamePath = vi.fn(async (fromPath: string, toPath: string) => {
      if (
        fromPath.includes(".pairflow-sync-") &&
        fromPath.endsWith(".tmp") &&
        toPath === statePath
      ) {
        throw new Error("simulated state rename apply failure");
      }
      if (fromPath.includes(".pairflow-sync-") && fromPath.endsWith(".bak") && toPath === transcriptPath) {
        transcriptRestoreAttempts += 1;
        if (transcriptRestoreAttempts === 1) {
          throw new Error("simulated restore collision");
        }
      }
      await rename(fromPath, toPath);
    });

    await expect(
      commitBubble(
        {
          bubbleId: "b_remote_commit_sync_restore_retry_01",
          cwd: repoPath,
          now: new Date("2026-04-18T08:17:00.000Z")
        },
        {
          resolveBubbleById: vi.fn(async () => ({
            bubbleId: "b_remote_commit_sync_restore_retry_01",
            repoPath,
            bubblePaths,
            bubbleConfig
          })),
          ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
            bubbleInstanceId: "bi_remote_commit_sync_restore_retry_01",
            bubbleConfig,
            backfilled: false
          })),
          readRemotePointer: vi.fn(async () =>
            createStartedRemotePointer("b_remote_commit_sync_restore_retry_01")
          ),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          importRemoteBubbleCommitContinuity: noRemoteCommitCompletionEvidence(),
          executeRemoteBubbleCommitCommand,
          appendProtocolEnvelope: vi.fn(async () => {
            throw new Error("unused");
          }),
          readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
          readTranscriptEnvelopes: vi.fn(async () => []),
          renamePath,
          runGit: vi.fn(async () => {
            throw new Error("unused");
          }),
          writeTextFile: vi.fn(async (path: string, content: string) => {
            await writeFile(path, content, "utf8");
          }),
          writeStateSnapshot: vi.fn(async () => {
            throw new Error("unused");
          })
        }
      )
    ).rejects.toThrow(/REMOTE_COMMIT_SYNC_BACK_FAILED/u);

    expect(transcriptRestoreAttempts).toBe(2);
    expect(await readFile(statePath, "utf8")).toBe(
      `${JSON.stringify(approvedState, null, 2)}\n`
    );
    expect(await readFile(transcriptPath, "utf8")).toContain(
      "\"msg_previous_remote_commit_sync_restore_retry_01\""
    );
    expect(
      (await readdir(dirname(statePath))).filter((name) =>
        name.includes(".pairflow-sync-")
      )
    ).toEqual([]);
  });

  it("imports proven remote completion on retry without invoking the remote producer", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_remote_commit_import_retry_01";
    const bubbleConfig = createRemoteBubbleConfig(repoPath, bubbleId);
    const bubblePaths = getBubblePaths(repoPath, bubbleId);
    const approvedState: PersistedBubbleStateSnapshot = {
      bubble_id: bubbleId,
      state: "APPROVED_FOR_COMMIT",
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
    const remoteDoneState: PersistedBubbleStateSnapshot = {
      ...approvedState,
      state: "DONE",
      last_command_at: "2026-04-18T08:21:00.000Z"
    };
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_remote_commit_import_retry_01",
      ts: "2026-04-18T08:21:00.000Z",
      bubble_id: bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_remote_commit_import_retry_01): finalize",
          commit_sha: "4567890"
        }
      },
      refs: []
    };
    await mkdir(dirname(bubblePaths.statePath), { recursive: true });
    await writeFile(
      bubblePaths.statePath,
      `${JSON.stringify(approvedState, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      bubblePaths.transcriptPath,
      `${JSON.stringify({
        ...remoteEnvelope,
        id: "msg_previous_remote_commit_import_retry_01",
        type: "PASS",
        payload: {
          summary: "Previous local stale state."
        }
      } satisfies ProtocolEnvelope)}\n`,
      "utf8"
    );

    const executeRemoteBubbleCommitCommand = vi.fn(async () => {
      throw new Error("remote commit producer must not run after import proof");
    });
    const importRemoteBubbleCommitContinuity = vi.fn(async () => ({
      classification: "imported_remote_completion" as const,
      bubbleId,
      sequence: 4,
      envelope: remoteEnvelope,
      state: remoteDoneState,
      stateContent: `${JSON.stringify(remoteDoneState, null, 2)}\n`,
      transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
      commitSha: "4567890",
      commitMessage: "bubble(b_remote_commit_import_retry_01): finalize",
      stagedFiles: ["feature.txt"]
    }));

    const result = await commitBubble(
      {
        bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-18T08:21:30.000Z")
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubbleId,
          repoPath,
          bubblePaths,
          bubbleConfig
        })),
        ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
          bubbleInstanceId: "bi_remote_commit_import_retry_01",
          bubbleConfig,
          backfilled: false
        })),
        readRemotePointer: vi.fn(async () => createStartedRemotePointer(bubbleId)),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        })),
        importRemoteBubbleCommitContinuity,
        executeRemoteBubbleCommitCommand,
        appendProtocolEnvelope: vi.fn(async () => {
          throw new Error("unused");
        }),
        readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
        readTranscriptEnvelopes: vi.fn(async () => []),
        runGit: vi.fn(async () => {
          throw new Error("unused");
        }),
        writeTextFile: vi.fn(async (path: string, content: string) => {
          await writeFile(path, content, "utf8");
        }),
        writeStateSnapshot: vi.fn(async () => {
          throw new Error("unused");
        })
      }
    );

    expect(result).toMatchObject({
      bubbleId,
      state: {
        state: "DONE"
      },
      commitSha: "4567890",
      stagedFiles: ["feature.txt"]
    });
    expect(executeRemoteBubbleCommitCommand).not.toHaveBeenCalled();
    expect(await readFile(bubblePaths.statePath, "utf8")).toBe(
      `${JSON.stringify(remoteDoneState, null, 2)}\n`
    );
    expect(await readFile(bubblePaths.transcriptPath, "utf8")).toBe(
      `${JSON.stringify(remoteEnvelope)}\n`
    );
    const metricsShard = resolveMetricsShardPath({
      at: new Date("2026-04-18T08:21:30.000Z")
    });
    const commitEvent = (await readFile(metricsShard.filePath, "utf8"))
      .trim()
      .split(/\n/u)
      .map((line) => JSON.parse(line) as {
        bubble_id?: string;
        event_type?: string;
        metadata?: Record<string, unknown>;
      })
      .find((event) =>
        event.bubble_id === bubbleId &&
        event.event_type === "bubble_committed"
      );
    expect(commitEvent?.metadata).toEqual({
      auto: false,
      commit_message: "bubble(b_remote_commit_import_retry_01): finalize",
      commit_sha: "4567890",
      refs_count: 0,
      staged_file_count: 1
    });
  });

  it("does not emit duplicate bubble_committed metric when imported completion is already locally DONE", async () => {
    const repoPath = await createTempRepo();
    const bubbleId = "b_remote_commit_import_done_retry_01";
    const bubbleConfig = createRemoteBubbleConfig(repoPath, bubbleId);
    const bubblePaths = getBubblePaths(repoPath, bubbleId);
    const doneState: PersistedBubbleStateSnapshot = {
      bubble_id: bubbleId,
      state: "DONE",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-18T08:22:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    };
    const remoteEnvelope: ProtocolEnvelope = {
      id: "msg_remote_commit_import_done_retry_01",
      ts: "2026-04-18T08:22:00.000Z",
      bubble_id: bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature.txt"],
          commit_message: "bubble(b_remote_commit_import_done_retry_01): finalize",
          commit_sha: "5678901"
        }
      },
      refs: []
    };
    await mkdir(dirname(bubblePaths.statePath), { recursive: true });
    await writeFile(
      bubblePaths.statePath,
      `${JSON.stringify(doneState, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      bubblePaths.transcriptPath,
      `${JSON.stringify(remoteEnvelope)}\n`,
      "utf8"
    );

    const result = await commitBubble(
      {
        bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-18T08:22:30.000Z")
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubbleId,
          repoPath,
          bubblePaths,
          bubbleConfig
        })),
        ensureBubbleInstanceIdForMutation: vi.fn(async () => ({
          bubbleInstanceId: "bi_remote_commit_import_done_retry_01",
          bubbleConfig,
          backfilled: false
        })),
        readRemotePointer: vi.fn(async () => createStartedRemotePointer(bubbleId)),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        })),
        importRemoteBubbleCommitContinuity: vi.fn(async () => ({
          classification: "imported_remote_completion" as const,
          bubbleId,
          sequence: 4,
          envelope: remoteEnvelope,
          state: doneState,
          stateContent: `${JSON.stringify(doneState, null, 2)}\n`,
          transcriptContent: `${JSON.stringify(remoteEnvelope)}\n`,
          commitSha: "5678901",
          commitMessage: "bubble(b_remote_commit_import_done_retry_01): finalize",
          stagedFiles: ["feature.txt"]
        })),
        executeRemoteBubbleCommitCommand: vi.fn(async () => {
          throw new Error("remote commit producer must not run after import proof");
        }),
        appendProtocolEnvelope: vi.fn(async () => {
          throw new Error("unused");
        }),
        readStateSnapshot: adaptPersistedReadPortToDomain(readStateSnapshot),
        readTranscriptEnvelopes: vi.fn(async () => []),
        runGit: vi.fn(async () => {
          throw new Error("unused");
        }),
        writeTextFile: vi.fn(async (path: string, content: string) => {
          await writeFile(path, content, "utf8");
        }),
        writeStateSnapshot: vi.fn(async () => {
          throw new Error("unused");
        })
      }
    );

    expect(result.commitSha).toBe("5678901");
    const metricsShard = resolveMetricsShardPath({
      at: new Date("2026-04-18T08:22:30.000Z")
    });
    const metricsContent = await readFile(metricsShard.filePath, "utf8").catch((error: unknown) => {
      if ((error as { code?: unknown }).code === "ENOENT") {
        return "";
      }
      throw error;
    });
    const duplicateEvents = metricsContent
      .trim()
      .split(/\n/u)
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as {
        bubble_id?: string;
        event_type?: string;
      })
      .filter((event) =>
        event.bubble_id === bubbleId &&
        event.event_type === "bubble_committed"
      );
    expect(duplicateEvents).toEqual([]);
  });
});
