import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { startBubble, StartBubbleError } from "../../../src/core/bubble/startBubble.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix: string = "pairflow-start-bubble-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function assertBashParses(command: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-n", "-c", command], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });
    child.on("close", (code) => {
      if ((code ?? 1) !== 0) {
        rejectPromise(new Error(`bash could not parse command: ${stderr.trim()}`));
        return;
      }
      resolvePromise();
    });
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("startBubble", () => {
  it("transitions CREATED -> PREPARING_WORKSPACE -> RUNNING and launches tmux", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_01",
      repoPath,
      baseBranch: "main",
      task: "Start bubble task",
      cwd: repoPath
    });

    const calls: string[] = [];
    const upserts: Array<{
      bubbleId: string;
      session: string;
      worktreePath: string;
    }> = [];
    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () => {
          calls.push("bootstrap");
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          });
        },
        launchBubbleTmuxSession: () => {
          calls.push("launch");
          return Promise.resolve({ sessionName: "pf-b_start_01" });
        },
        upsertRuntimeSession: (input) => {
          upserts.push({
            bubbleId: input.bubbleId,
            session: input.tmuxSessionName,
            worktreePath: input.worktreePath
          });
          return Promise.resolve({
            bubbleId: input.bubbleId,
            repoPath: input.repoPath,
            worktreePath: input.worktreePath,
            tmuxSessionName: input.tmuxSessionName,
            updatedAt: "2026-02-22T13:00:00.000Z"
          });
        }
      }
    );

    expect(calls).toEqual(["bootstrap", "launch"]);
    expect(result.tmuxSessionName).toBe("pf-b_start_01");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_agent).toBe("codex");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(1);
    expect(upserts).toEqual([
      {
        bubbleId: created.bubbleId,
        session: "pf-b_start_01",
        worktreePath: created.paths.worktreePath
      }
    ]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
  });

  it("rolls back runtime artifacts when runtime session registration fails", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_021",
      repoPath,
      baseBranch: "main",
      task: "Start bubble task",
      cwd: repoPath
    });

    let cleanupCalled = false;
    const removedSessions: string[] = [];
    const terminatedSessions: string[] = [];

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:11:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            Promise.resolve({
              repoPath,
              baseRef: "refs/heads/main",
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            }),
          launchBubbleTmuxSession: () =>
            Promise.resolve({ sessionName: "pf-b_start_021" }),
          upsertRuntimeSession: () =>
            Promise.reject(new Error("sessions registry unavailable")),
          removeRuntimeSession: (input) => {
            removedSessions.push(input.bubbleId);
            return Promise.resolve(true);
          },
          terminateBubbleTmuxSession: (input) => {
            if (input.sessionName !== undefined) {
              terminatedSessions.push(input.sessionName);
            }
            return Promise.resolve({
              sessionName: input.sessionName ?? "unknown",
              existed: true
            });
          },
          cleanupWorktreeWorkspace: () => {
            cleanupCalled = true;
            return Promise.resolve({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedBranch: true,
              removedWorktree: true
            });
          }
        }
      )
    ).rejects.toBeInstanceOf(StartBubbleError);

    expect(cleanupCalled).toBe(true);
    expect(removedSessions).toEqual([created.bubbleId]);
    expect(terminatedSessions).toEqual(["pf-b_start_021"]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("FAILED");
  });

  it("marks bubble FAILED when tmux launch fails", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_02",
      repoPath,
      baseBranch: "main",
      task: "Start bubble task",
      cwd: repoPath
    });

    let cleanupCalled = false;
    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:10:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            Promise.resolve({
              repoPath,
              baseRef: "refs/heads/main",
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            }),
          launchBubbleTmuxSession: () =>
            Promise.reject(new Error("tmux unavailable")),
          cleanupWorktreeWorkspace: () => {
            cleanupCalled = true;
            return Promise.resolve({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedBranch: true,
              removedWorktree: true
            });
          }
        }
      )
    ).rejects.toBeInstanceOf(StartBubbleError);

    expect(cleanupCalled).toBe(true);
    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("FAILED");
  });

  it("builds status pane command that remains shell-parseable with quoted repo path", async () => {
    const repoPath = await createTempRepo("pairflow-start-bubble-quote'-");
    const created = await createBubble({
      id: "b_start_03",
      repoPath,
      baseBranch: "main",
      task: "Start bubble task",
      cwd: repoPath
    });

    let statusCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:20:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
        launchBubbleTmuxSession: (input) => {
          statusCommand = input.statusCommand;
          return Promise.resolve({ sessionName: "pf-b_start_03" });
        }
      }
    );

    if (statusCommand === undefined) {
      throw new Error("Expected status command to be captured.");
    }
    expect(statusCommand).toContain("pairflow bubble watchdog --id");
    expect(statusCommand).toContain("pairflow bubble status --id");
    expect(statusCommand).not.toContain("--json");
    await assertBashParses(statusCommand);
  });

  it("rejects start when runtime session is already registered for bubble", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_04",
      repoPath,
      baseBranch: "main",
      task: "Start bubble task",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: created.paths.sessionsPath,
      bubbleId: created.bubbleId,
      repoPath,
      worktreePath: created.paths.worktreePath,
      tmuxSessionName: "pf-b_start_04",
      now: new Date("2026-02-22T20:00:00.000Z")
    });

    let bootstrapCalled = false;
    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T20:01:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () => {
            bootstrapCalled = true;
            return Promise.resolve({
              repoPath,
              baseRef: "refs/heads/main",
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            });
          }
        }
      )
    ).rejects.toThrow(/Runtime session already registered/u);

    expect(bootstrapCalled).toBe(false);
    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("CREATED");
  });
});
