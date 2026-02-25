import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

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
import { branchExists } from "../../../src/core/workspace/git.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-delete-bubble-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
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

    await expect(stat(bubble.paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
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
    ).rejects.toThrow("workspace cleanup failed");

    expect(cleanupWorktreeWorkspace).toHaveBeenCalledTimes(1);
    expect(removeBubbleDirectory).not.toHaveBeenCalled();
    await expect(stat(bubble.paths.bubbleDir)).resolves.toBeDefined();
  });

  it("force deletes corrupted bubble when state snapshot is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_delete_05",
      task: "Delete task"
    });
    await rm(bubble.paths.statePath, { force: true });

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
        )
      }
    );

    expect(result.deleted).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.removedWorktree).toBe(true);
    expect(result.removedBubbleBranch).toBe(true);
    await expect(stat(bubble.paths.bubbleDir)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(stat(bubble.paths.worktreePath)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(branchExists(repoPath, bubble.config.bubble_branch)).resolves.toBe(false);
  });
});
