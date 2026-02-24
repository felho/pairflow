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
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

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
    let implementerCommand: string | undefined;
    let reviewerCommand: string | undefined;
    const claims: Array<{
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
        bootstrapWorktreeWorkspace: (bootstrapInput) => {
          calls.push("bootstrap");
          expect(bootstrapInput.localOverlay).toEqual({
            enabled: true,
            mode: "symlink",
            entries: [".claude", ".mcp.json", ".env.local", ".env.production"]
          });
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          });
        },
        launchBubbleTmuxSession: (input) => {
          calls.push("launch");
          implementerCommand = input.implementerCommand;
          reviewerCommand = input.reviewerCommand;
          // Bootstrap messages removed — startup prompts are embedded in agent commands.
          expect(input.implementerBootstrapMessage).toBeUndefined();
          expect(input.reviewerBootstrapMessage).toBeUndefined();
          expect(input.implementerKickoffMessage).toContain(
            `bubble=${created.bubbleId} kickoff`
          );
          expect(input.implementerKickoffMessage).toContain(
            created.paths.taskArtifactPath
          );
          return Promise.resolve({ sessionName: "pf-b_start_01" });
        },
        claimRuntimeSession: (input) => {
          claims.push({
            bubbleId: input.bubbleId,
            session: input.tmuxSessionName,
            worktreePath: input.worktreePath
          });
          return Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
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
    expect(claims).toEqual([
      {
        bubbleId: created.bubbleId,
        session: "pf-b_start_01",
        worktreePath: created.paths.worktreePath
      }
    ]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");

    if (implementerCommand === undefined || reviewerCommand === undefined) {
      throw new Error("Expected agent commands to be captured.");
    }
    expect(implementerCommand).toContain("Dropping to interactive shell");
    expect(reviewerCommand).toContain("Dropping to interactive shell");
    expect(implementerCommand).toContain("set +e");
    expect(reviewerCommand).toContain("set +e");
    expect(implementerCommand).toContain("exec bash -i");
    expect(reviewerCommand).toContain("exec bash -i");
    expect(implementerCommand).toContain("codex");
    expect(implementerCommand).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(implementerCommand).toContain("Pairflow implementer start");
    expect(implementerCommand).toContain(created.paths.taskArtifactPath);
    expect(implementerCommand).toContain(
      join(created.paths.artifactsDir, "done-package.md")
    );
    expect(reviewerCommand).toContain("claude");
    expect(reviewerCommand).toContain("--dangerously-skip-permissions");
    expect(reviewerCommand).toContain("--permission-mode");
    expect(reviewerCommand).toContain("bypassPermissions");
    expect(reviewerCommand).toContain("Pairflow reviewer start");
    expect(reviewerCommand).toContain("Stand by first. Do not start reviewing");
    expect(implementerCommand).not.toContain("then;");
    expect(reviewerCommand).not.toContain("then;");
    await assertBashParses(implementerCommand);
    await assertBashParses(reviewerCommand);
  });

  it("fails before bootstrap when runtime session ownership claim fails", async () => {
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
    let bootstrapCalled = false;

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:11:00.000Z")
        },
        {
          claimRuntimeSession: () =>
            Promise.reject(new Error("sessions registry unavailable")),
          bootstrapWorktreeWorkspace: () =>
            {
              bootstrapCalled = true;
              return Promise.resolve({
                repoPath,
                baseRef: "refs/heads/main",
                bubbleBranch: created.config.bubble_branch,
                worktreePath: created.paths.worktreePath
              });
            },
          launchBubbleTmuxSession: () =>
            Promise.resolve({ sessionName: "pf-b_start_021" }),
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

    expect(bootstrapCalled).toBe(false);
    expect(cleanupCalled).toBe(false);
    expect(removedSessions).toEqual([]);
    expect(terminatedSessions).toEqual([]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("CREATED");
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

  it("resumes tmux session from RUNNING state without workspace bootstrap", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_01",
      task: "Resume bubble"
    });

    let bootstrapCalled = false;
    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () => {
          bootstrapCalled = true;
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: bubble.config.bubble_branch,
            worktreePath: bubble.paths.worktreePath
          });
        },
        launchBubbleTmuxSession: (input) => {
          expect(input.implementerBootstrapMessage).toBeUndefined();
          expect(input.reviewerBootstrapMessage).toBeUndefined();
          expect(input.implementerKickoffMessage).toBeUndefined();
          expect(input.implementerCommand).toContain(
            "--dangerously-bypass-approvals-and-sandbox"
          );
          expect(input.reviewerCommand).toContain("--dangerously-skip-permissions");
          return Promise.resolve({ sessionName: "pf-b_start_resume_01" });
        }
      }
    );

    expect(bootstrapCalled).toBe(false);
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.last_command_at).toBe("2026-02-23T09:00:00.000Z");
  });

  it("keeps runtime state unchanged when resume tmux launch fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_02",
      task: "Resume bubble failure"
    });

    await expect(
      startBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-23T09:10:00.000Z")
        },
        {
          launchBubbleTmuxSession: () =>
            Promise.reject(new Error("tmux unavailable for resume"))
        }
      )
    ).rejects.toBeInstanceOf(StartBubbleError);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
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
          isTmuxSessionAlive: () => Promise.resolve(true),
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

  it("removes stale runtime session registration when tmux session is missing", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_05",
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
      tmuxSessionName: "pf-b_start_05-stale",
      now: new Date("2026-02-22T20:10:00.000Z")
    });

    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T20:11:00.000Z")
      },
      {
        isTmuxSessionAlive: () => Promise.resolve(false),
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_start_05" })
      }
    );

    expect(result.tmuxSessionName).toBe("pf-b_start_05");
    expect(result.state.state).toBe("RUNNING");

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
  });
});
