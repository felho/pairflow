import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { resolveArchivePaths } from "../../../src/core/archive/archivePaths.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import {
  deleteBubble,
  type DeleteBubbleDependencies
} from "../../../src/core/bubble/deleteBubble.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  upsertRuntimeSession
} from "../../../src/core/runtime/sessionsRegistry.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { ArchiveIndexDocument } from "../../../src/types/archive.js";
import { branchExists } from "../../../src/core/workspace/git.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];
const initialArchiveRoot = process.env.PAIRFLOW_ARCHIVE_ROOT;

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

beforeEach(async () => {
  process.env.PAIRFLOW_ARCHIVE_ROOT = await createTempDir("pairflow-archive-root-");
});

afterEach(async () => {
  if (initialArchiveRoot === undefined) {
    delete process.env.PAIRFLOW_ARCHIVE_ROOT;
  } else {
    process.env.PAIRFLOW_ARCHIVE_ROOT = initialArchiveRoot;
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

describe("deleteBubble", () => {
  it("throws when tmux has-session fails with unexpected exit code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_tmux_err_01",
      repoPath,
      baseBranch: "main",
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
            archivePath: "/tmp/pairflow/archive/fake"
          })),
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

  it("forwards archiveRootPath and uses global archive locks path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_delete_archive_root_01",
      repoPath,
      baseBranch: "main",
      task: "Delete with explicit archive root",
      cwd: repoPath
    });
    const archiveRootPath = "/tmp/pairflow-custom-archive-root";
    const archiveLocksDir = join(homedir(), ".pairflow", "locks");
    const createArchiveSnapshotMock = vi.fn(async () => ({
      archivePath: "/tmp/pairflow-custom-archive-root/fake-instance"
    }));
    const upsertArchiveIndexMock = vi.fn(async () => ({}));

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
