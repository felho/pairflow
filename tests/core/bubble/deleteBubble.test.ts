import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { resolveArchivePaths } from "../../../src/v11/infrastructure/artifact/archive/archivePaths.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import {
  deleteBubble,
  type DeleteBubbleDependencies
} from "../../../src/v11/application/delete/deleteBubble.js";
import {
  remoteDeleteModeEnvVar,
  remoteDeleteModeInnerRemoteExecution,
  remoteDeleteWorkspaceRootEnvVar
} from "../../../src/v11/application/delete/remoteDeleteExecutionContext.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  upsertRuntimeSession
} from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  CreateArchiveSnapshotResult
} from "../../../src/v11/infrastructure/artifact/archive/archiveSnapshot.js";
import type {
  UpsertDeletedArchiveIndexEntryResult
} from "../../../src/v11/infrastructure/artifact/archive/archiveIndex.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import type { ArchiveIndexDocument, ArchiveManifest } from "../../../src/types/archive.js";
import { branchExists } from "../../../src/v11/infrastructure/workspace/git.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];
const initialArchiveRoot = process.env.PAIRFLOW_ARCHIVE_ROOT;
const initialMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;

async function createTempDir(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function createTempRepo(prefix = "pairflow-delete-bubble-"): Promise<string> {
  const root = await createTempDir(prefix);
  await initGitRepository(root);
  return root;
}

async function convertRunningBubbleToClone(
  repoPath: string,
  bubble: Awaited<ReturnType<typeof setupRunningBubbleFixture>>
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

async function convertDeleteBubbleToRemoteStarted(
  bubble: Awaited<ReturnType<typeof createBubble>>
) {
  await writeFile(
    bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...bubble.config,
      executor: {
        type: "ssh",
        remote: "prod"
      }
    }),
    "utf8"
  );
  await writeFile(
    bubble.paths.remotePointerPath,
    JSON.stringify(
      {
        kind: "started",
        host: "ssh.example.com",
        instanceId: `inst_${bubble.bubbleId}`,
        remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}`,
        tmuxSession: `pf-${bubble.bubbleId}`,
        startedAt: "2026-04-18T08:00:00.000Z"
      },
      null,
      2
    ),
    "utf8"
  );
  return bubble;
}

async function convertDeleteBubbleToRemoteCreated(
  bubble: Awaited<ReturnType<typeof createBubble>>
) {
  await writeFile(
    bubble.paths.bubbleTomlPath,
    renderBubbleConfigToml({
      ...bubble.config,
      executor: {
        type: "ssh",
        remote: "prod"
      }
    }),
    "utf8"
  );
  await writeFile(
    bubble.paths.remotePointerPath,
    JSON.stringify(
      {
        kind: "created",
        host: "ssh.example.com"
      },
      null,
      2
    ),
    "utf8"
  );
  return bubble;
}

beforeEach(async () => {
  process.env.PAIRFLOW_ARCHIVE_ROOT = await createTempDir("pairflow-archive-root-");
  process.env.PAIRFLOW_METRICS_EVENTS_ROOT = await createTempDir("pairflow-metrics-root-");
});

afterEach(async () => {
  if (initialArchiveRoot === undefined) {
    delete process.env.PAIRFLOW_ARCHIVE_ROOT;
  } else {
    process.env.PAIRFLOW_ARCHIVE_ROOT = initialArchiveRoot;
  }
  if (initialMetricsRoot === undefined) {
    delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
  } else {
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = initialMetricsRoot;
  }

  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

async function readArchiveIndexFromRepo(
  repoPath: string
): Promise<ArchiveIndexDocument> {
  const archiveRootPath = process.env.PAIRFLOW_ARCHIVE_ROOT as string;
  const paths = await resolveArchivePaths({
    repoPath,
    bubbleInstanceId: "bi_archive_index_probe",
    archiveRootPath
  });

  return JSON.parse(await readFile(paths.archiveIndexPath, "utf8")) as ArchiveIndexDocument;
}

async function readMetricsEventsForDate(at: Date): Promise<Record<string, unknown>[]> {
  const metricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
  if (metricsRoot === undefined) {
    throw new Error("PAIRFLOW_METRICS_EVENTS_ROOT is not configured.");
  }
  const year = at.getUTCFullYear().toString();
  const month = String(at.getUTCMonth() + 1).padStart(2, "0");
  const shardPath = join(metricsRoot, year, month, `events-${year}-${month}.ndjson`);
  const raw = await readFile(shardPath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function buildArchiveManifest(input: {
  bubbleId: string;
  bubbleInstanceId: string;
  repoPath: string;
  sourceBubbleDir: string;
  archivedAt: string;
}): ArchiveManifest {
  return {
    schema_version: 1,
    archived_at: input.archivedAt,
    repo_path: input.repoPath,
    repo_key: "pairflow-delete-bubble",
    bubble_instance_id: input.bubbleInstanceId,
    bubble_id: input.bubbleId,
    source_bubble_dir: input.sourceBubbleDir,
    archived_files: []
  };
}

describe("deleteBubble", () => {
  it("throws when tmux has-session fails with unexpected exit code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_tmux_err_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete task",
      cwd: repoPath
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "failed to connect to server",
              exitCode: 2
            })
          )
        }
      )
    ).rejects.toThrow(/tmux has-session failed/u);

    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("deletes bubble immediately when only definition files exist", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete task",
      cwd: repoPath
    });

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runTmux: vi.fn(() => Promise.resolve({
          stdout: "",
          stderr: "no session",
          exitCode: 1
        }))
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.artifacts.worktree.exists).toBe(false);
    expect(result.artifacts.branch.exists).toBe(false);

    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
    const manifest = JSON.parse(
      await readFile(
        join(archivePaths.bubbleInstanceArchivePath, "archive-manifest.json"),
        "utf8"
      )
    ) as { bubble_instance_id: string; bubble_id: string };
    expect(manifest).toMatchObject({
      bubble_instance_id: bubble.config.bubble_instance_id,
      bubble_id: bubble.bubbleId
    });
    const index = await readArchiveIndexFromRepo(repoPath);
    expect(
      index.entries.filter(
        (entry) => entry.bubble_instance_id === bubble.config.bubble_instance_id
      )
    ).toHaveLength(1);
    expect(index.entries[0]?.status).toBe("deleted");

    await expect(stat(bubble.paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("fills archive index created_at from bubble metadata when available", async () => {
    const repoPath = await createTempRepo();
    const createdAt = new Date("2026-02-26T12:00:00.000Z");
    const bubble = await createBubble({
      id: "b_delete_created_at_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete task created_at metadata",
      cwd: repoPath,
      now: createdAt
    });

    await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        )
      }
    );

    const index = await readArchiveIndexFromRepo(repoPath);
    const entry = index.entries.find(
      (item) => item.bubble_instance_id === bubble.config.bubble_instance_id
    );
    expect(entry?.created_at).toBe(createdAt.toISOString());
  });

  it("deletes without confirmation when only runtime session exists", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_rt_only",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete task",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: join(repoPath, ".pairflow", "runtime", "sessions.json"),
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: "/tmp/fake-worktree",
      tmuxSessionName: "pf-b_delete_rt_only",
      now: new Date("2026-02-25T10:00:00.000Z")
    });

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runTmux: vi.fn(() => Promise.resolve({
          stdout: "",
          stderr: "no session",
          exitCode: 1
        })),
        removeRuntimeSession: vi.fn(async () => true)
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.artifacts.runtimeSession.exists).toBe(true);
    expect(result.artifacts.worktree.exists).toBe(false);
    expect(result.artifacts.tmux.exists).toBe(false);
    expect(result.artifacts.branch.exists).toBe(false);
    expect(result.runtimeSessionRemoved).toBe(true);
  });

  it("requires confirmation when external artifacts exist and force is false", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_02",
      task: "Delete task"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_delete_02",
      now: new Date("2026-02-25T10:00:00.000Z")
    });

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runTmux: vi.fn(() => Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result.deleted).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.artifacts.worktree.exists).toBe(true);
    expect(result.artifacts.tmux.exists).toBe(true);
    expect(result.artifacts.runtimeSession.exists).toBe(true);
    expect(result.artifacts.branch.exists).toBe(true);

    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("force deletes bubble and cleans runtime/worktree/branch artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_03",
      task: "Delete task"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_delete_03",
      now: new Date("2026-02-25T10:05:00.000Z")
    });
    const stopBubbleMock: NonNullable<DeleteBubbleDependencies["stopBubble"]> = async () => {
      await removeRuntimeSession({
        sessionsPath: bubble.paths.sessionsPath,
        bubbleId: bubble.bubbleId
      });
      return {
        bubbleId: bubble.bubbleId,
        state: {
          bubble_id: bubble.bubbleId,
          state: "CANCELLED" as const,
          round: 1,
          active_agent: null,
          active_role: null,
          active_since: null,
          last_command_at: "2026-02-25T10:05:30.000Z",
          round_role_history: []
        },
        tmuxSessionName: "pf-b_delete_03",
        tmuxSessionExisted: true,
        runtimeSessionRemoved: true
      };
    };

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        runTmux: vi.fn(() => Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 0
        })),
        stopBubble: vi.fn(stopBubbleMock)
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.tmuxSessionTerminated).toBe(true);
    expect(result.runtimeSessionRemoved).toBe(true);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);

    await expect(stat(bubble.paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(branchExists(repoPath, bubble.config.bubble_branch)).resolves.toBe(false);

    const sessions = await readRuntimeSessionsRegistry(bubble.paths.sessionsPath, {
      allowMissing: true
    });
    expect(sessions[bubble.bubbleId]).toBeUndefined();
  });

  it("force deletes clone workspace and removes the owned source branch", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertRunningBubbleToClone(
      repoPath,
      await setupRunningBubbleFixture({
        repoPath,
        bubbleId: "b_delete_clone_owned_01",
        task: "Delete owned clone workspace"
      })
    );
    await runGit(bubble.paths.worktreePath, ["checkout", "--detach"]);

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        ),
        stopBubble: vi.fn(async () => ({
          bubbleId: bubble.bubbleId,
          state: {
            bubble_id: bubble.bubbleId,
            state: "CANCELLED" as const,
            round: 1,
            active_agent: null,
            active_role: null,
            active_since: null,
            last_command_at: "2026-02-25T10:05:30.000Z",
            round_role_history: []
          },
          tmuxSessionName: `pf-${bubble.bubbleId}`,
          tmuxSessionExisted: false,
          runtimeSessionRemoved: false
        }))
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);
    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(branchExists(repoPath, bubble.config.bubble_branch)).resolves.toBe(false);
  });

  it("keeps the source branch when clone cleanup cannot prove ownership", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertRunningBubbleToClone(
      repoPath,
      await setupRunningBubbleFixture({
        repoPath,
        bubbleId: "b_delete_clone_unowned_01",
        task: "Delete clone with retained source branch"
      })
    );

    await runGit(repoPath, ["checkout", bubble.config.bubble_branch]);
    await writeFile(join(repoPath, "source-diverged.txt"), "source branch moved\n", "utf8");
    await runGit(repoPath, ["add", "source-diverged.txt"]);
    await runGit(repoPath, ["commit", "-m", "feat(source): diverged before delete"]);
    await runGit(repoPath, ["checkout", "main"]);

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        ),
        stopBubble: vi.fn(async () => ({
          bubbleId: bubble.bubbleId,
          state: {
            bubble_id: bubble.bubbleId,
            state: "CANCELLED" as const,
            round: 1,
            active_agent: null,
            active_role: null,
            active_since: null,
            last_command_at: "2026-02-25T10:05:30.000Z",
            round_role_history: []
          },
          tmuxSessionName: `pf-${bubble.bubbleId}`,
          tmuxSessionExisted: false,
          runtimeSessionRemoved: false
        }))
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(false);
    await expect(branchExists(repoPath, bubble.config.bubble_branch)).resolves.toBe(true);
  });

  it("falls back to remove runtime session when stop reports runtimeSessionRemoved=false", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_03b",
      task: "Delete task"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_delete_03b",
      now: new Date("2026-02-25T10:06:00.000Z")
    });

    const removeRuntimeSessionMock = vi.fn(removeRuntimeSession);
    const stopBubbleMock: NonNullable<DeleteBubbleDependencies["stopBubble"]> = async () => ({
      bubbleId: bubble.bubbleId,
      state: {
        bubble_id: bubble.bubbleId,
        state: "CANCELLED" as const,
        round: 1,
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-02-25T10:06:30.000Z",
        round_role_history: []
      },
      tmuxSessionName: "pf-b_delete_03b",
      tmuxSessionExisted: true,
      runtimeSessionRemoved: false
    });

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        ),
        stopBubble: vi.fn(stopBubbleMock),
        removeRuntimeSession: removeRuntimeSessionMock
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.runtimeSessionRemoved).toBe(true);
    expect(removeRuntimeSessionMock).toHaveBeenCalledWith({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId
    });

    const sessions = await readRuntimeSessionsRegistry(bubble.paths.sessionsPath, {
      allowMissing: true
    });
    expect(sessions[bubble.bubbleId]).toBeUndefined();
  });

  it("does not run stopBubble for COMMITTED state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_committed_01",
      task: "Delete committed bubble"
    });

    const loadedState = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loadedState.state,
        state: "COMMITTED",
        execution_context: null,
        active_agent: null,
        active_role: null,
        active_since: null
      },
      {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_delete_committed_01",
      now: new Date("2026-02-25T10:08:00.000Z")
    });

    const stopBubbleMock = vi.fn(async () => ({
      bubbleId: bubble.bubbleId,
      state: {
        bubble_id: bubble.bubbleId,
        state: "CANCELLED" as const,
        round: 1,
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-02-25T10:08:30.000Z",
        round_role_history: []
      },
      tmuxSessionName: "pf-b_delete_committed_01",
      tmuxSessionExisted: false,
      runtimeSessionRemoved: false
    }));

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        ),
        stopBubble: stopBubbleMock
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.runtimeSessionRemoved).toBe(true);
    expect(stopBubbleMock).not.toHaveBeenCalled();
    await expect(branchExists(repoPath, bubble.config.bubble_branch)).resolves.toBe(false);
  });

  it("does not remove bubble directory when workspace cleanup fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_04",
      task: "Delete task"
    });

    const cleanupError = new Error("workspace cleanup failed");
    const cleanupWorktreeWorkspace = vi.fn(async () => {
      throw cleanupError;
    });
    const removeBubbleDirectory = vi.fn(async () => undefined);
    const stopBubbleMock: NonNullable<DeleteBubbleDependencies["stopBubble"]> = async () => ({
      bubbleId: bubble.bubbleId,
      state: {
        bubble_id: bubble.bubbleId,
        state: "CANCELLED" as const,
        round: 1,
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-02-25T10:15:30.000Z",
        round_role_history: []
      },
      tmuxSessionName: `pf-${bubble.bubbleId}`,
      tmuxSessionExisted: false,
      runtimeSessionRemoved: false
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "no session",
              exitCode: 1
            })
          ),
          stopBubble: vi.fn(stopBubbleMock),
          cleanupWorktreeWorkspace,
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=worktree-cleanup.*workspace cleanup failed/u);

    expect(cleanupWorktreeWorkspace).toHaveBeenCalledTimes(1);
    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    const bubbleInstanceId = bubble.config.bubble_instance_id as string;
    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
    const index = await readArchiveIndexFromRepo(repoPath);
    expect(
      index.entries.some(
        (entry) =>
          entry.bubble_instance_id === bubbleInstanceId && entry.status === "deleted"
      )
    ).toBe(true);
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails delete when required archive source state.json is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_05",
      task: "Delete task"
    });
    await rm(bubble.paths.statePath, { force: true });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "no session",
              exitCode: 1
            })
          )
        }
      )
    ).rejects.toThrow(/step=snapshot/u);

    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("keeps active bubble directory when archive snapshot step fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_archive_snapshot_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete with snapshot failure",
      cwd: repoPath
    });
    const removeBubbleDirectory = vi.fn(async () => undefined);
    const cleanupWorktreeWorkspace = vi.fn(() =>
      Promise.resolve({
        repoPath,
        bubbleBranch: bubble.config.bubble_branch,
        worktreePath: bubble.paths.worktreePath,
        removedWorktree: false,
        removedBranch: false
      })
    );

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "no session",
              exitCode: 1
            })
          ),
          createArchiveSnapshot: vi.fn(async () => {
            throw new Error("snapshot failed");
          }),
          cleanupWorktreeWorkspace,
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=snapshot/u);

    expect(cleanupWorktreeWorkspace).not.toHaveBeenCalled();
    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("keeps active bubble directory when archive index step fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_archive_index_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete with index failure",
      cwd: repoPath
    });
    const removeBubbleDirectory = vi.fn(async () => undefined);

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "no session",
              exitCode: 1
            })
          ),
          createArchiveSnapshot: vi.fn(async () => ({
            archivePath: "/tmp/pairflow/archive/fake",
            manifest: buildArchiveManifest({
              bubbleId: bubble.bubbleId,
              bubbleInstanceId: bubble.config.bubble_instance_id as string,
              repoPath,
              sourceBubbleDir: bubble.paths.bubbleDir,
              archivedAt: "2026-04-09T00:00:00.000Z"
            }),
            reusedExisting: false
          } satisfies CreateArchiveSnapshotResult)),
          upsertDeletedArchiveIndexEntry: vi.fn(async () => {
            throw new Error("index failed");
          }),
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=index/u);

    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("preserves archive and index when remove-active fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_remove_active_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete with remove failure",
      cwd: repoPath
    });
    const removeBubbleDirectory = vi.fn(async () => {
      throw new Error("permission denied");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "no session",
              exitCode: 1
            })
          ),
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=remove-active/u);

    const bubbleInstanceId = bubble.config.bubble_instance_id as string;
    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
    const index = await readArchiveIndexFromRepo(repoPath);
    expect(
      index.entries.some(
        (entry) =>
          entry.bubble_instance_id === bubbleInstanceId && entry.status === "deleted"
      )
    ).toBe(true);
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("backfills legacy bubble_instance_id before archive path resolution", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_legacy_backfill_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Legacy delete backfill",
      cwd: repoPath
    });
    const current = parseBubbleConfigToml(await readFile(bubble.paths.bubbleTomlPath, "utf8"));
    const legacy = { ...current };
    delete legacy.bubble_instance_id;
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml(legacy),
      "utf8"
    );

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        )
      }
    );

    expect(result.deleted).toBe(true);
    const index = await readArchiveIndexFromRepo(repoPath);
    const entry = index.entries.find((item) => item.bubble_id === bubble.bubbleId);
    expect(entry).toBeDefined();
    const bubbleInstanceId = entry?.bubble_instance_id as string;
    expect(bubbleInstanceId).toMatch(/^bi_[A-Za-z0-9_-]{10,}$/u);
    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
  });

  it("retries delete idempotently after a prior remove-active failure", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_retry_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Retry delete after remove failure",
      cwd: repoPath
    });
    const bubbleInstanceId = bubble.config.bubble_instance_id as string;
    const removeBubbleDirectory = vi.fn(async () => {
      throw new Error("simulated remove failure");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          runTmux: vi.fn(() =>
            Promise.resolve({
              stdout: "",
              stderr: "no session",
              exitCode: 1
            })
          ),
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=remove-active/u);

    const retried = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        )
      }
    );

    expect(retried.deleted).toBe(true);
    await expect(stat(bubble.paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    const archiveNames = await readdir(archivePaths.repoArchiveRootPath);
    expect(
      archiveNames.filter((name) => name === bubbleInstanceId)
    ).toHaveLength(1);
    expect(
      archiveNames.some((name) => name.startsWith(`.tmp-${bubbleInstanceId}-`))
    ).toBe(false);
    const index = await readArchiveIndexFromRepo(repoPath);
    expect(
      index.entries.filter((entry) => entry.bubble_instance_id === bubbleInstanceId)
    ).toHaveLength(1);
  });

  it("handles concurrent delete attempts without duplicate archive index entries", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_concurrent_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Concurrent delete",
      cwd: repoPath
    });
    const bubbleInstanceId = bubble.config.bubble_instance_id as string;

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        deleteBubble(
          {
            bubbleId: bubble.bubbleId,
            cwd: repoPath
          },
          {
            runTmux: vi.fn(() =>
              Promise.resolve({
                stdout: "",
                stderr: "no session",
                exitCode: 1
              })
            )
          }
        )
      )
    );

    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
    const index = await readArchiveIndexFromRepo(repoPath);
    expect(
      index.entries.filter((entry) => entry.bubble_instance_id === bubbleInstanceId)
    ).toHaveLength(1);
  });

  it("routes remote started delete confirmation through the remote authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_confirm_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete confirm",
        cwd: repoPath
      })
    );
    const pathExists = vi.fn(async () => {
      throw new Error("local inventory must not drive remote confirmation");
    });
    const branchExistsMock = vi.fn(async () => {
      throw new Error("local branch inventory must not drive remote confirmation");
    });
    const executeRemoteBubbleDeleteCommand = vi.fn(async () => ({
      result: {
        bubbleId: bubble.bubbleId,
        deleted: false,
        requiresConfirmation: true,
        artifacts: {
          worktree: {
            exists: true,
            path: `/srv/pairflow/repo--${bubble.bubbleId}`
          },
          tmux: {
            exists: true,
            sessionName: `pf-${bubble.bubbleId}`
          },
          runtimeSession: {
            exists: true,
            sessionName: `pf-${bubble.bubbleId}`
          },
          branch: {
            exists: true,
            name: bubble.config.bubble_branch
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      }
    }));

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      },
      {
        pathExists,
        branchExists: branchExistsMock,
        executeRemoteBubbleDeleteCommand,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }))
      }
    );

    expect(result.requiresConfirmation).toBe(true);
    expect(result.artifacts.worktree.path).toBe(`/srv/pairflow/repo--${bubble.bubbleId}`);
    expect(pathExists).not.toHaveBeenCalled();
    expect(branchExistsMock).not.toHaveBeenCalled();
    expect(executeRemoteBubbleDeleteCommand).toHaveBeenCalledWith({
      bubbleId: bubble.bubbleId,
      remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}`,
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      force: false
    });
  });

  it("fails closed when remote delete runs without a started pointer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_remote_missing_pointer_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote delete missing pointer",
      cwd: repoPath
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      }),
      "utf8"
    );
    const pathExists = vi.fn(async () => {
      throw new Error("local inventory must not run when started pointer is missing");
    });
    const executeRemoteBubbleDeleteCommand = vi.fn(async () => {
      throw new Error("remote delete helper must not run without a started pointer");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          pathExists,
          executeRemoteBubbleDeleteCommand
        }
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(pathExists).not.toHaveBeenCalled();
    expect(executeRemoteBubbleDeleteCommand).not.toHaveBeenCalled();
  });

  it("fails closed when remote delete only has a created pointer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteCreated(
      await createBubble({
        id: "b_delete_remote_created_pointer_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete created pointer",
        cwd: repoPath
      })
    );
    const pathExists = vi.fn(async () => {
      throw new Error("local inventory must not run when pointer is only created");
    });
    const executeRemoteBubbleDeleteCommand = vi.fn(async () => {
      throw new Error("remote delete helper must not run with a created pointer");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          pathExists,
          executeRemoteBubbleDeleteCommand
        }
      )
    ).rejects.toThrow(/requires a started remote pointer/u);

    expect(pathExists).not.toHaveBeenCalled();
    expect(executeRemoteBubbleDeleteCommand).not.toHaveBeenCalled();
  });

  it("keeps local archive continuity on remote started delete success", async () => {
    const repoPath = await createTempRepo();
    const now = new Date("2026-04-18T16:20:00.000Z");
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_success_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete success",
        cwd: repoPath
      })
    );
    const remoteState = `{\n  "bubble_id": "${bubble.bubbleId}",\n  "state": "DONE"\n}\n`;
    const remoteTranscript =
      `{"id":"msg_remote_delete_01","bubble_id":"${bubble.bubbleId}","type":"DONE_PACKAGE"}\n`;
    const cleanupWorktreeWorkspace = vi.fn(async () => {
      throw new Error("local workspace cleanup must stay unused on remote success");
    });

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true,
        now
      },
      {
        executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
          result: {
            bubbleId: bubble.bubbleId,
            deleted: true,
            requiresConfirmation: false,
            artifacts: {
              worktree: {
                exists: true,
                path: `/srv/pairflow/repo--${bubble.bubbleId}`
              },
              tmux: {
                exists: true,
                sessionName: `pf-${bubble.bubbleId}`
              },
              runtimeSession: {
                exists: true,
                sessionName: `pf-${bubble.bubbleId}`
              },
              branch: {
                exists: true,
                name: bubble.config.bubble_branch
              }
            },
            tmuxSessionTerminated: true,
            runtimeSessionRemoved: true,
            removedWorktree: true,
            removedBubbleBranch: true
          },
          archiveCapture: {
            sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
            bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
            stateJson: remoteState,
            transcriptNdjson: remoteTranscript,
            inboxNdjson: "",
            taskMarkdown: "# Remote Task\n\nCanonical remote delete payload.\n"
          }
        })),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        })),
        pathExists: vi.fn(async () => {
          throw new Error("local inventory must not drive remote delete success");
        }),
        branchExists: vi.fn(async () => {
          throw new Error("local branch inventory must not drive remote delete success");
        }),
        cleanupWorktreeWorkspace
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.tmuxSessionTerminated).toBe(true);
    expect(result.runtimeSessionRemoved).toBe(true);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);

    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    const manifest = JSON.parse(
      await readFile(
        join(archivePaths.bubbleInstanceArchivePath, "archive-manifest.json"),
        "utf8"
      )
    ) as ArchiveManifest;
    expect(manifest.source_bubble_dir).toBe(
      `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`
    );
    expect(
      await readFile(join(archivePaths.bubbleInstanceArchivePath, "state.json"), "utf8")
    ).toBe(remoteState);
    expect(
      await readFile(
        join(archivePaths.bubbleInstanceArchivePath, "transcript.ndjson"),
        "utf8"
      )
    ).toBe(remoteTranscript);
    expect(cleanupWorktreeWorkspace).not.toHaveBeenCalled();
    expect(
      (await readMetricsEventsForDate(now)).find(
        (event) => event.event_type === "bubble_deleted"
      )
    ).toMatchObject({
      bubble_id: bubble.bubbleId,
      bubble_instance_id: bubble.config.bubble_instance_id,
      event_type: "bubble_deleted",
      round: null,
      actor_role: "orchestrator",
      metadata: {
        force: true,
        tmux_session_terminated: true,
        runtime_session_removed: true,
        removed_worktree: true,
        removed_bubble_branch: true,
        had_worktree: true,
        had_tmux_session: true,
        had_runtime_session: true,
        had_branch: true
      }
    });
    await expect(stat(bubble.paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("fails closed when remote delete finalization cannot remove the local bubble directory", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_remove_active_fail_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete local remove-active failure",
        cwd: repoPath
      })
    );
    const now = new Date("2026-04-18T16:35:00.000Z");
    const removeBubbleDirectory = vi.fn(async () => {
      throw new Error("permission denied");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true,
          now
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: true,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                branch: {
                  exists: true,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: true,
              runtimeSessionRemoved: true,
              removedWorktree: true,
              removedBubbleBranch: true
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_remove_active_fail_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=remove-active/u);

    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
    const index = await readArchiveIndexFromRepo(repoPath);
    expect(
      index.entries.some(
        (entry) =>
          entry.bubble_instance_id === bubble.config.bubble_instance_id
          && entry.status === "deleted"
      )
    ).toBe(true);
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails closed when non-force remote delete reports deleted=true even if remote artifacts are already absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_zero_art_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete zero artifact contract",
        cwd: repoPath
      })
    );
    const remoteState = `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`;
    const createArchiveSnapshot = vi.fn(async () => {
      throw new Error("archive must not run on non-force remote success payload");
    });
    const removeBubbleDirectory = vi.fn(async () => undefined);

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: false,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: false,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: false,
                  sessionName: null
                },
                branch: {
                  exists: false,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: remoteState,
              transcriptNdjson: `{"id":"msg_remote_zero_artifact_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot,
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(
      /non-force remote delete must stay on the confirmation contract and must not report deleted=true/u
    );

    expect(createArchiveSnapshot).not.toHaveBeenCalled();
    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails closed when remote confirmation payload reports a different bubble identity", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_id_mismatch_confirm_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete confirmation identity mismatch",
        cwd: repoPath
      })
    );
    const createArchiveSnapshot = vi.fn(async () => {
      throw new Error("archive must not run on remote confirmation mismatch");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: "b_delete_remote_id_mismatch_other_01",
              deleted: false,
              requiresConfirmation: true,
              artifacts: {
                worktree: {
                  exists: true,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                branch: {
                  exists: true,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot
        }
      )
    ).rejects.toThrow(/returned payload for bubble b_delete_remote_id_mismatch_other_01/u);

    expect(createArchiveSnapshot).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails closed when remote success payload reports a different bubble identity", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_id_mismatch_success_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete success identity mismatch",
        cwd: repoPath
      })
    );
    const createArchiveSnapshot = vi.fn(async () => {
      throw new Error("archive must not run on remote success mismatch");
    });
    const removeBubbleDirectory = vi.fn(async () => undefined);

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: "b_delete_remote_id_mismatch_other_02",
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: true,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                branch: {
                  exists: true,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: true,
              runtimeSessionRemoved: true,
              removedWorktree: true,
              removedBubbleBranch: true
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_id_mismatch_success_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot,
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/force path returned payload for bubble b_delete_remote_id_mismatch_other_02/u);

    expect(createArchiveSnapshot).not.toHaveBeenCalled();
    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails closed when remote archive continuity cannot be materialized locally", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_archive_fail_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete archive fail",
        cwd: repoPath
      })
    );
    const removeBubbleDirectory = vi.fn(async () => undefined);

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: true,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                branch: {
                  exists: true,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: true,
              runtimeSessionRemoved: true,
              removedWorktree: true,
              removedBubbleBranch: true
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_archive_fail_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot: vi.fn(async () => {
            throw new Error("snapshot failed");
          }),
          removeBubbleDirectory
        }
      )
    ).rejects.toThrow(/step=snapshot/u);

    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    expect(await readFile(bubble.paths.statePath, "utf8")).toContain("\"state\": \"CREATED\"");
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails closed when remote delete does not prove clone cleanup", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_cleanup_missing_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete cleanup proof",
        cwd: repoPath
      })
    );
    const createArchiveSnapshot = vi.fn(async () => {
      throw new Error("archive should not run without remote cleanup proof");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: true,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: false,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: false,
                  sessionName: null
                },
                branch: {
                  exists: true,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_cleanup_missing_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot
        }
      )
    ).rejects.toThrow(/did not prove destructive cleanup of the remote clone/u);

    expect(createArchiveSnapshot).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("fails closed when remote delete does not prove tmux cleanup", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_tmux_cleanup_missing_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete tmux cleanup proof",
        cwd: repoPath
      })
    );

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: false,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: false,
                  sessionName: null
                },
                branch: {
                  exists: false,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_tmux_cleanup_missing_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot: vi.fn(async () => {
            throw new Error("archive should not run without tmux cleanup proof");
          })
        }
      )
    ).rejects.toThrow(/did not prove tmux cleanup for the remote session/u);
  });

  it("fails closed when remote delete does not prove runtime-session cleanup", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_del_remote_runtime_clean_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete runtime cleanup proof",
        cwd: repoPath
      })
    );

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: false,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: false,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: true,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                branch: {
                  exists: false,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_runtime_cleanup_missing_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot: vi.fn(async () => {
            throw new Error("archive should not run without runtime cleanup proof");
          })
        }
      )
    ).rejects.toThrow(/did not prove runtime-session cleanup/u);
  });

  it("fails closed when remote delete does not prove branch cleanup", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_del_remote_branch_clean_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete branch cleanup proof",
        cwd: repoPath
      })
    );

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          force: true
        },
        {
          executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
            result: {
              bubbleId: bubble.bubbleId,
              deleted: true,
              requiresConfirmation: false,
              artifacts: {
                worktree: {
                  exists: false,
                  path: `/srv/pairflow/repo--${bubble.bubbleId}`
                },
                tmux: {
                  exists: false,
                  sessionName: `pf-${bubble.bubbleId}`
                },
                runtimeSession: {
                  exists: false,
                  sessionName: null
                },
                branch: {
                  exists: true,
                  name: bubble.config.bubble_branch
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            },
            archiveCapture: {
              sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
              bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
              stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
              transcriptNdjson: `{"id":"msg_remote_branch_cleanup_missing_01"}\n`,
              inboxNdjson: ""
            }
          })),
          resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          })),
          createArchiveSnapshot: vi.fn(async () => {
            throw new Error("archive should not run without branch cleanup proof");
          })
        }
      )
    ).rejects.toThrow(/did not prove remote branch cleanup/u);
  });

  it("accepts remote delete success when the canonical remote worktree was already absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteStarted(
      await createBubble({
        id: "b_delete_remote_absent_worktree_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote delete absent worktree",
        cwd: repoPath
      })
    );

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        executeRemoteBubbleDeleteCommand: vi.fn(async () => ({
          result: {
            bubbleId: bubble.bubbleId,
            deleted: true,
            requiresConfirmation: false,
            artifacts: {
              worktree: {
                exists: false,
                path: `/srv/pairflow/repo--${bubble.bubbleId}`
              },
              tmux: {
                exists: false,
                sessionName: `pf-${bubble.bubbleId}`
              },
              runtimeSession: {
                exists: false,
                sessionName: null
              },
              branch: {
                exists: false,
                name: bubble.config.bubble_branch
              }
            },
            tmuxSessionTerminated: false,
            runtimeSessionRemoved: false,
            removedWorktree: false,
            removedBubbleBranch: false
          },
          archiveCapture: {
            sourceBubbleDir: `/srv/pairflow/repo--${bubble.bubbleId}/.pairflow/bubbles/${bubble.bubbleId}`,
            bubbleToml: await readFile(bubble.paths.bubbleTomlPath, "utf8"),
            stateJson: `{"bubble_id":"${bubble.bubbleId}","state":"DONE"}\n`,
            transcriptNdjson: `{"id":"msg_remote_absent_worktree_01"}\n`,
            inboxNdjson: ""
          }
        })),
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }))
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.artifacts.worktree.exists).toBe(false);
    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      archiveRootPath: process.env.PAIRFLOW_ARCHIVE_ROOT
    });
    await expect(stat(archivePaths.bubbleInstanceArchivePath)).resolves.toBeDefined();
  });

  it("uses the local canonical delete path inside a verified remote clone execution context", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_remote_clone_local_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote clone local delete",
      cwd: repoPath
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        executor: {
          type: "ssh",
          remote: "prod"
        }
      }),
      "utf8"
    );
    vi.stubEnv(remoteDeleteModeEnvVar, remoteDeleteModeInnerRemoteExecution);
    vi.stubEnv(remoteDeleteWorkspaceRootEnvVar, repoPath);

    const pathExists = vi.fn(async (path: string) => path === repoPath);
    const branchExistsMock = vi.fn(async () => false);
    const executeRemoteBubbleDeleteCommand = vi.fn(async () => {
      throw new Error("remote delete helper should not run inside verified remote clone execution");
    });
    const cleanupWorktreeWorkspace = vi.fn(async () => ({
      repoPath,
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: repoPath,
      removedWorktree: true,
      removedBranch: false
    }));
    const removeBubbleDirectory = vi.fn(async () => undefined);

    const result = await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        force: true
      },
      {
        pathExists,
        branchExists: branchExistsMock,
        runTmux: vi.fn(async () => ({
          stdout: "",
          stderr: "no session",
          exitCode: 1
        })),
        executeRemoteBubbleDeleteCommand,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => {
          throw new Error("remote target resolution should not run in remote_clone route");
        }),
        cleanupWorktreeWorkspace,
        removeBubbleDirectory
      }
    );

    expect(result.deleted).toBe(true);
    expect(pathExists).toHaveBeenCalledWith(repoPath);
    expect(cleanupWorktreeWorkspace).toHaveBeenCalledWith({
      repoPath,
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: repoPath
    });
    expect(executeRemoteBubbleDeleteCommand).not.toHaveBeenCalled();
  });

  it("fails closed in remote clone execution when source-repo remote artifacts still exist", async () => {
    const repoPath = await createTempRepo();
    const bubble = await convertDeleteBubbleToRemoteCreated(
      await createBubble({
        id: "b_delete_remote_clone_orphan_guard_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "Remote clone orphan guard",
        cwd: repoPath
      })
    );
    vi.stubEnv(remoteDeleteModeEnvVar, remoteDeleteModeInnerRemoteExecution);
    vi.stubEnv(remoteDeleteWorkspaceRootEnvVar, repoPath);

    const executeRemoteBubbleDeleteCommand = vi.fn(async () => {
      throw new Error("remote delete helper should not run when orphan guard triggers");
    });

    await expect(
      deleteBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath
        },
        {
          executeRemoteBubbleDeleteCommand
        }
      )
    ).rejects.toThrow(/refused to continue because source-repo remote artifacts are still present/u);

    expect(executeRemoteBubbleDeleteCommand).not.toHaveBeenCalled();
  });

  it("forwards archiveRootPath and uses global archive locks path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_archive_root_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Delete with explicit archive root",
      cwd: repoPath
    });
    const archiveRootPath = "/tmp/pairflow-custom-archive-root";
    const archiveLocksDir = join(homedir(), ".pairflow", "locks");
    const createArchiveSnapshotMock = vi.fn(async () => ({
      archivePath: "/tmp/pairflow-custom-archive-root/fake-instance",
      manifest: buildArchiveManifest({
        bubbleId: bubble.bubbleId,
        bubbleInstanceId: bubble.config.bubble_instance_id as string,
        repoPath,
        sourceBubbleDir: bubble.paths.bubbleDir,
        archivedAt: "2026-04-09T00:00:00.000Z"
      }),
      reusedExisting: false
    } satisfies CreateArchiveSnapshotResult));
    const upsertArchiveIndexMock = vi.fn(async () => ({
      indexPath: "/tmp/pairflow-custom-archive-root/index.json",
      entry: {
        bubble_instance_id: bubble.config.bubble_instance_id as string,
        bubble_id: bubble.bubbleId,
        repo_path: repoPath,
        repo_key: "pairflow-delete-bubble",
        archive_path: "/tmp/pairflow-custom-archive-root/fake-instance",
        status: "deleted",
        created_at: "2026-04-09T00:00:00.000Z",
        deleted_at: "2026-04-09T00:00:00.000Z",
        purged_at: null,
        updated_at: "2026-04-09T00:00:00.000Z"
      }
    } satisfies UpsertDeletedArchiveIndexEntryResult));

    await deleteBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        archiveRootPath
      },
      {
        runTmux: vi.fn(() =>
          Promise.resolve({
            stdout: "",
            stderr: "no session",
            exitCode: 1
          })
        ),
        createArchiveSnapshot: createArchiveSnapshotMock,
        upsertDeletedArchiveIndexEntry: upsertArchiveIndexMock
      }
    );

    expect(createArchiveSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        archiveRootPath,
        locksDir: archiveLocksDir
      })
    );
    expect(upsertArchiveIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({
        archiveRootPath,
        locksDir: archiveLocksDir
      })
    );
  });
});
