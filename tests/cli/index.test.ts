import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../src/config/bubbleConfig.js";
import { renderBubbleCommitText, runCli } from "../../src/cli/index.js";
import type { CommitBubbleResult } from "../../src/v11/application/commit/commitCommandContract.js";
import { writeRemotePointer } from "../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { mergeBubbleDependencyDefaults } from "../../src/v11/defaults/merge/mergeCommandDefaults.js";
import { createBubble } from "../../src/v11/application/create/createBubble.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../src/v11/infrastructure/workspace/worktreeManager.js";
import { setupRunningBubbleFixture } from "../helpers/bubble.js";
import { initGitRepository, runGit } from "../helpers/git.js";

describe("runCli", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const tempDirs: string[] = [];

  async function setupDoneBubbleFixture(repoPath: string, bubbleId: string) {
    const bubble = await createBubble({
      repoPath,
      id: bubbleId,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "CLI bubble merge test task",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      `${bubble.bubbleId}\n`,
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    await runGit(bubble.paths.worktreePath, ["commit", "-m", `feat(${bubble.bubbleId}): change`]);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "DONE",
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-04-18T10:00:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "CREATED"
      }
    );

    return bubble;
  }

  async function convertDoneBubbleToRemoteStarted(
    bubble: Awaited<ReturnType<typeof setupDoneBubbleFixture>>
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

    await writeRemotePointer(bubble.paths.remotePointerPath, {
      kind: "started",
      host: "ssh.example.com",
      user: "pairflow",
      instanceId: `inst_${bubble.bubbleId}`,
      remoteClonePath: `/srv/pairflow/repo--${bubble.bubbleId}`,
      tmuxSession: `pf-${bubble.bubbleId}`,
      startedAt: "2026-04-18T08:00:00.000Z"
    });

    return bubble;
  }

  afterEach(async () => {
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
    await Promise.all(
      tempDirs.splice(0).map((path) =>
        rm(path, {
          recursive: true,
          force: true
        })
      )
    );
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });
  it("routes top-level pass help to removal guidance", async () => {
    const exitCode = await runCli(["pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Removed legacy alias:");
    expect(output).toContain("pairflow pass");
  });

  it("routes agent pass help to removal guidance", async () => {
    const exitCode = await runCli(["agent", "pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Removed legacy alias:");
    expect(output).toContain("pairflow pass");
  });

  it("supports agent emit namespace", async () => {
    const exitCode = await runCli(["agent", "emit", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("routes top-level ask-human help to removal guidance", async () => {
    const exitCode = await runCli(["ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Removed legacy alias:");
    expect(output).toContain("pairflow ask-human");
  });

  it("routes agent ask-human help to removal guidance", async () => {
    const exitCode = await runCli(["agent", "ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Removed legacy alias:");
    expect(output).toContain("pairflow ask-human");
  });

  it("supports bubble reply help", async () => {
    const exitCode = await runCli(["bubble", "reply", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble start help", async () => {
    const exitCode = await runCli(["bubble", "start", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble kickoff help", async () => {
    const exitCode = await runCli(["bubble", "kickoff", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble open help", async () => {
    const exitCode = await runCli(["bubble", "open", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble stop help", async () => {
    const exitCode = await runCli(["bubble", "stop", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble delete help", async () => {
    const exitCode = await runCli(["bubble", "delete", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble extract help", async () => {
    const exitCode = await runCli(["bubble", "extract", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("pairflow bubble extract");
    expect(output).not.toContain("--delete-bubble");
  });

  it("returns zero for bubble extract when selected files are copied without closing the source bubble", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-extract-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await createBubble({
      repoPath,
      id: "b_cli_extract_01",
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await mkdir(join(bubble.paths.worktreePath, "docs"), { recursive: true });
    await writeFile(
      join(bubble.paths.worktreePath, "docs", "idea.md"),
      "# Extracted idea\n"
    );
    await runGit(repoPath, ["add", ".pairflow"]);
    await runGit(repoPath, ["commit", "-m", "test: add ideation bubble"]);

    const previousCwd = process.cwd();
    try {
      process.chdir(repoPath);
      const exitCode = await runCli([
        "bubble",
        "extract",
        "--id",
        bubble.bubbleId,
        "--path",
        "docs/idea.md"
      ]);

      expect(exitCode).toBe(0);
      const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
      expect(output).toContain(`Extracted ${bubble.bubbleId}: copied 1 selected path(s).`);
      await expect(readFile(join(repoPath, "docs", "idea.md"), "utf8"))
        .resolves.toBe("# Extracted idea\n");
      await expect(readFile(bubble.paths.bubbleTomlPath, "utf8"))
        .resolves.toContain(`id = "${bubble.bubbleId}"`);
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("commits selected files through bubble extract --commit using real git side effects", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-extract-commit-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await createBubble({
      repoPath,
      id: "b_cli_extract_commit_01",
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await mkdir(join(bubble.paths.worktreePath, "docs"), { recursive: true });
    await writeFile(
      join(bubble.paths.worktreePath, "docs", "idea.md"),
      "# Committed idea\n",
      "utf8"
    );
    await runGit(repoPath, ["add", ".pairflow"]);
    await runGit(repoPath, ["commit", "-m", "test: add commit ideation bubble"]);

    const previousCwd = process.cwd();
    try {
      process.chdir(repoPath);
      const exitCode = await runCli([
        "bubble",
        "extract",
        "--id",
        bubble.bubbleId,
        "--path",
        "docs/idea.md",
        "--commit",
        "--message",
        "docs: extract committed idea"
      ]);

      expect(exitCode).toBe(0);
      const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
      expect(output).toContain(`Extracted ${bubble.bubbleId}: copied 1 selected path(s).`);
      expect(output).toContain("Committed ");
      expect(output).toContain("with message: docs: extract committed idea");
      await expect(readFile(join(repoPath, "docs", "idea.md"), "utf8"))
        .resolves.toBe("# Committed idea\n");
      await expect(runGit(repoPath, ["log", "-1", "--format=%s"]))
        .resolves.toMatchObject({ stdout: "docs: extract committed idea\n" });
      await expect(runGit(repoPath, ["show", "HEAD:docs/idea.md"]))
        .resolves.toMatchObject({ stdout: "# Committed idea\n" });
      await expect(runGit(repoPath, ["status", "--porcelain"]))
        .resolves.toMatchObject({ stdout: "" });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("commits explicitly selected ignored files through bubble extract --commit", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-extract-ignored-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    await writeFile(join(repoPath, ".gitignore"), "docs/ignored.md\n", "utf8");
    const bubble = await createBubble({
      repoPath,
      id: "b_cli_extract_ignored_01",
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await mkdir(join(bubble.paths.worktreePath, "docs"), { recursive: true });
    await writeFile(
      join(bubble.paths.worktreePath, "docs", "ignored.md"),
      "# Ignored but selected\n",
      "utf8"
    );
    await runGit(repoPath, ["add", ".gitignore", ".pairflow"]);
    await runGit(repoPath, ["commit", "-m", "test: add ignored ideation bubble"]);

    const previousCwd = process.cwd();
    try {
      process.chdir(repoPath);
      const exitCode = await runCli([
        "bubble",
        "extract",
        "--id",
        bubble.bubbleId,
        "--path",
        "docs/ignored.md",
        "--commit",
        "--message",
        "docs: extract ignored artifact"
      ]);

      expect(exitCode).toBe(0);
      await expect(runGit(repoPath, ["show", "HEAD:docs/ignored.md"]))
        .resolves.toMatchObject({ stdout: "# Ignored but selected\n" });
      await expect(runGit(repoPath, ["status", "--porcelain"]))
        .resolves.toMatchObject({ stdout: "" });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("uses --repo to locate bubble extract when cwd is outside the repository", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-extract-repo-"));
    const outsideCwd = await mkdtemp(join(tmpdir(), "pairflow-cli-extract-outside-"));
    tempDirs.push(repoPath, outsideCwd);
    await initGitRepository(repoPath);
    const bubble = await createBubble({
      repoPath,
      id: "b_cli_extract_repo_01",
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await mkdir(join(bubble.paths.worktreePath, "docs"), { recursive: true });
    await writeFile(
      join(bubble.paths.worktreePath, "docs", "idea.md"),
      "# Extracted idea\n"
    );
    await runGit(repoPath, ["add", ".pairflow"]);
    await runGit(repoPath, ["commit", "-m", "test: add ideation bubble"]);

    const previousCwd = process.cwd();
    try {
      process.chdir(outsideCwd);
      const exitCode = await runCli([
        "bubble",
        "extract",
        "--id",
        bubble.bubbleId,
        "--repo",
        repoPath,
        "--path",
        "docs/idea.md"
      ]);

      expect(exitCode).toBe(0);
      const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
      expect(output).toContain(`Extracted ${bubble.bubbleId}: copied 1 selected path(s).`);
      expect(output).not.toContain("EXTRACT_BUBBLE_NOT_FOUND");
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("supports bubble resume help", async () => {
    const exitCode = await runCli(["bubble", "resume", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble restart help", async () => {
    const exitCode = await runCli(["bubble", "restart", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble status help", async () => {
    const exitCode = await runCli(["bubble", "status", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble watchdog help", async () => {
    const exitCode = await runCli(["bubble", "watchdog", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble inbox help", async () => {
    const exitCode = await runCli(["bubble", "inbox", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble list help", async () => {
    const exitCode = await runCli(["bubble", "list", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble reconcile help", async () => {
    const exitCode = await runCli(["bubble", "reconcile", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble commit help", async () => {
    const exitCode = await runCli(["bubble", "commit", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("surfaces removed bubble commit --auto through the command error path", async () => {
    const exitCode = await runCli(["bubble", "commit", "--id", "b_cli_commit_01", "--auto"]);

    expect(exitCode).toBe(1);
    const output = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("COMMIT_AUTO_REMOVED");
    expect(output).toContain("--stage-all");
  });

  it("renders bubble commit output with the returned envelope type", () => {
    const output = renderBubbleCommitText({
      bubbleId: "b_cli_commit_remote_01",
      sequence: 7,
      envelope: {
        id: "msg_commit_remote_01",
        ts: "2026-04-18T08:20:00.000Z",
        bubble_id: "b_cli_commit_remote_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          metadata: {
            commit_sha: "abcdef1234567890",
            commit_message: "bubble(b_cli_commit_remote_01): finalize",
            staged_files: ["feature-remote.txt"]
          }
        },
        refs: []
      },
      state: {
        bubble_id: "b_cli_commit_remote_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_role: null,
        active_since: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:20:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      },
      commitSha: "abcdef1234567890",
      commitMessage: "bubble(b_cli_commit_remote_01): finalize",
      stagedFiles: ["feature-remote.txt"]
    } satisfies CommitBubbleResult);

    expect(output).toBe(
      "Committed bubble b_cli_commit_remote_01: abcdef1234567890 (1 files), COMMIT_RESULT msg_commit_remote_01\n"
    );
  });

  it("supports bubble merge help", async () => {
    const exitCode = await runCli(["bubble", "merge", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("renders local bubble merge output from the merge result route", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-merge-local-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupDoneBubbleFixture(repoPath, "b_cli_merge_local_01");

    const exitCode = await runCli([
      "bubble",
      "merge",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);

    expect(exitCode).toBe(0);
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain(`Merged bubble ${bubble.bubbleId}:`);
    expect(output).toContain("pushed=no");
    expect(output).toContain("remoteDeleted=no");
    expect(output).not.toContain("durableMerge=localRepoFromStartedRemoteHandoff");
  });

  it("renders started-remote bubble merge output from the merge result route", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-merge-remote-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubbleFixture(repoPath, "b_cli_merge_remote_01")
    );
    const remoteCommitSha = (
      await runGit(repoPath, ["rev-parse", bubble.config.bubble_branch])
    ).stdout.trim();
    const importRef = `refs/pairflow/import/${bubble.bubbleId}`;

    const resolveRemoteBubbleStatusTargetSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "resolveRemoteBubbleStatusTarget")
      .mockResolvedValue({
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      });
    const executeRemoteBubbleMergeCommandSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "executeRemoteBubbleMergeCommand")
      .mockResolvedValue({
        bubbleId: bubble.bubbleId,
        baseBranch: "main",
        bubbleBranch: bubble.config.bubble_branch,
        mergeCommitSha: remoteCommitSha,
        importSource: {
          kind: "git_ref",
          ref: importRef,
          commitSha: remoteCommitSha
        },
        cleanupPending: true,
        tmuxSessionName: `pf-${bubble.bubbleId}`
      });
    const executeRemoteBubbleMergeCleanupCommandSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "executeRemoteBubbleMergeCleanupCommand")
      .mockResolvedValue({
        bubbleId: bubble.bubbleId,
        baseBranch: "main",
        bubbleBranch: bubble.config.bubble_branch,
        artifacts: {
          worktree: {
            path: `/srv/pairflow/repo--${bubble.bubbleId}`,
            existed: true
          },
          tmux: {
            sessionName: `pf-${bubble.bubbleId}`,
            existed: true
          },
          runtimeSession: {
            path: `${repoPath}/.pairflow/runtime/sessions/${bubble.bubbleId}.json`,
            existed: true
          },
          branch: {
            name: bubble.config.bubble_branch,
            existed: true
          }
        },
        tmuxSessionTerminated: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true,
        tmuxSessionName: `pf-cleanup-${bubble.bubbleId}`
      });
    const branchExistsSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "branchExists")
      .mockImplementation(async (_repoPath, branch) => branch === "main");
    const originalRunGit = mergeBubbleDependencyDefaults.runGit;
    const runGitSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "runGit")
      .mockImplementation(async (args, options) => {
        if (
          args[0] === "fetch"
          && args[1] === "--no-tags"
          && args[3] === `${importRef}:${importRef}`
        ) {
          return originalRunGit(["update-ref", importRef, remoteCommitSha], options);
        }

        return originalRunGit(args, options);
      });

    try {
      const exitCode = await runCli([
        "bubble",
        "merge",
        "--id",
        bubble.bubbleId,
        "--repo",
        repoPath
      ]);

      expect(exitCode).toBe(0);
      expect(resolveRemoteBubbleStatusTargetSpy).toHaveBeenCalledOnce();
      expect(executeRemoteBubbleMergeCommandSpy).toHaveBeenCalledOnce();
      expect(executeRemoteBubbleMergeCleanupCommandSpy).toHaveBeenCalledOnce();
      expect(branchExistsSpy).toHaveBeenCalledTimes(1);
      expect(branchExistsSpy.mock.calls[0]?.[1]).toBe("main");
      expect(runGitSpy).toHaveBeenCalled();

      const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
      expect(output).toContain(`Merged bubble ${bubble.bubbleId}:`);
      expect(output).toContain("durableMerge=localRepoFromStartedRemoteHandoff");
      expect(output).not.toContain("pushed=");
      expect(output).not.toContain("remoteDeleted=");
    } finally {
      runGitSpy.mockRestore();
      branchExistsSpy.mockRestore();
      executeRemoteBubbleMergeCleanupCommandSpy.mockRestore();
      executeRemoteBubbleMergeCommandSpy.mockRestore();
      resolveRemoteBubbleStatusTargetSpy.mockRestore();
    }
  });

  it("renders started-remote bubble merge JSON output with the presentation route", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-merge-remote-json-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await convertDoneBubbleToRemoteStarted(
      await setupDoneBubbleFixture(repoPath, "b_cli_merge_remote_json_01")
    );
    const remoteCommitSha = (
      await runGit(repoPath, ["rev-parse", bubble.config.bubble_branch])
    ).stdout.trim();
    const importRef = `refs/pairflow/import/${bubble.bubbleId}`;

    const resolveRemoteBubbleStatusTargetSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "resolveRemoteBubbleStatusTarget")
      .mockResolvedValue({
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      });
    const executeRemoteBubbleMergeCommandSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "executeRemoteBubbleMergeCommand")
      .mockResolvedValue({
        bubbleId: bubble.bubbleId,
        baseBranch: "main",
        bubbleBranch: bubble.config.bubble_branch,
        mergeCommitSha: remoteCommitSha,
        importSource: {
          kind: "git_ref",
          ref: importRef,
          commitSha: remoteCommitSha
        },
        cleanupPending: true,
        tmuxSessionName: `pf-${bubble.bubbleId}`
      });
    const executeRemoteBubbleMergeCleanupCommandSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "executeRemoteBubbleMergeCleanupCommand")
      .mockResolvedValue({
        bubbleId: bubble.bubbleId,
        baseBranch: "main",
        bubbleBranch: bubble.config.bubble_branch,
        artifacts: {
          worktree: {
            path: `/srv/pairflow/repo--${bubble.bubbleId}`,
            existed: true
          },
          tmux: {
            sessionName: `pf-${bubble.bubbleId}`,
            existed: true
          },
          runtimeSession: {
            path: `${repoPath}/.pairflow/runtime/sessions/${bubble.bubbleId}.json`,
            existed: true
          },
          branch: {
            name: bubble.config.bubble_branch,
            existed: true
          }
        },
        tmuxSessionTerminated: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true,
        tmuxSessionName: `pf-cleanup-${bubble.bubbleId}`
      });
    const originalRunGit = mergeBubbleDependencyDefaults.runGit;
    const runGitSpy = vi
      .spyOn(mergeBubbleDependencyDefaults, "runGit")
      .mockImplementation(async (args, options) => {
        if (
          args[0] === "fetch"
          && args[1] === "--no-tags"
          && args[3] === `${importRef}:${importRef}`
        ) {
          return originalRunGit(["update-ref", importRef, remoteCommitSha], options);
        }

        return originalRunGit(args, options);
      });

    try {
      const exitCode = await runCli([
        "bubble",
        "merge",
        "--id",
        bubble.bubbleId,
        "--repo",
        repoPath,
        "--json"
      ]);

      expect(exitCode).toBe(0);
      expect(resolveRemoteBubbleStatusTargetSpy).toHaveBeenCalledOnce();
      expect(executeRemoteBubbleMergeCommandSpy).toHaveBeenCalledOnce();
      expect(executeRemoteBubbleMergeCleanupCommandSpy).toHaveBeenCalledOnce();
      expect(runGitSpy).toHaveBeenCalled();

      const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
      const parsed = JSON.parse(output) as {
        bubbleId: string;
        presentationRoute: string;
        pushedBaseBranch: boolean;
        deletedRemoteBranch: boolean;
      };
      expect(parsed.bubbleId).toBe(bubble.bubbleId);
      expect(parsed.presentationRoute).toBe("started_remote");
      expect(parsed.pushedBaseBranch).toBe(false);
      expect(parsed.deletedRemoteBranch).toBe(false);
    } finally {
      runGitSpy.mockRestore();
      executeRemoteBubbleMergeCleanupCommandSpy.mockRestore();
      executeRemoteBubbleMergeCommandSpy.mockRestore();
      resolveRemoteBubbleStatusTargetSpy.mockRestore();
    }
  });

  it("routes top-level converged help to removal guidance", async () => {
    const exitCode = await runCli(["converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Removed legacy alias:");
    expect(output).toContain("pairflow converged");
  });

  it("routes agent converged help to removal guidance", async () => {
    const exitCode = await runCli(["agent", "converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Removed legacy alias:");
    expect(output).toContain("pairflow converged");
  });

  it("supports bubble approve help", async () => {
    const exitCode = await runCli(["bubble", "approve", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble request-rework help", async () => {
    const exitCode = await runCli(["bubble", "request-rework", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports ui help", async () => {
    const exitCode = await runCli(["ui", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("pairflow ui");
  });

  it("supports repo list help", async () => {
    const exitCode = await runCli(["repo", "list", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("pairflow repo list");
  });

  it("supports metrics report help", async () => {
    const exitCode = await runCli(["metrics", "report", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("pairflow metrics report");
  });

  it("rejects unknown agent namespace command", async () => {
    const exitCode = await runCli(["agent", "unknown"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("agent emit");
    expect(output).not.toContain("agent pass");
    expect(output).not.toContain("agent ask-human");
    expect(output).not.toContain("agent converged");
    expect(output).not.toContain(", pass,");
  });

  it("rejects unknown bubble subcommand", async () => {
    const exitCode = await runCli(["bubble", "unknown"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("rejects removed bubble meta-review namespace as an unknown subcommand", async () => {
    const exitCode = await runCli(["bubble", "meta-review", "--help"]);

    expect(exitCode).toBe(1);
    const errorText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(errorText).toContain("Unknown command. Supported:");
    expect(errorText).not.toContain("bubble meta-review");
  });

  it("returns non-zero for invalid metrics date range", async () => {
    const exitCode = await runCli([
      "metrics",
      "report",
      "--from",
      "2026-03-01",
      "--to",
      "2026-02-01"
    ]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("prints registry-backed unknown command support list", async () => {
    const exitCode = await runCli(["unknown"]);

    expect(exitCode).toBe(1);
    const errorText = stderrSpy.mock.calls.map((call) => call[0]).join("");
    expect(errorText).toContain("ui");
    expect(errorText).toContain("bubble watchdog");
    expect(errorText).toContain("repo list");
    expect(errorText).toContain("metrics report");
    expect(errorText).toContain("agent emit");
    expect(errorText).not.toContain("agent converged");
    expect(errorText).not.toContain("bubble meta-review");
  });

  it("returns non-zero for bubble delete when confirmation is required", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-delete-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);

    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b_delete_cli_01",
      repoPath,
      task: "Delete CLI confirmation test"
    });

    const binDir = await mkdtemp(join(tmpdir(), "pairflow-cli-delete-bin-"));
    tempDirs.push(binDir);
    const tmuxPath = join(binDir, "tmux");
    await writeFile(
      tmuxPath,
      "#!/bin/sh\nexit 1\n",
      "utf8"
    );
    await chmod(tmuxPath, 0o755);

    const originalPath = process.env.PATH;
    process.env.PATH = `${binDir}${process.platform === "win32" ? ";" : ":"}${originalPath ?? ""}`;
    try {
      const exitCode = await runCli([
        "bubble",
        "delete",
        "--id",
        bubble.bubbleId,
        "--repo",
        repoPath
      ]);

      expect(exitCode).toBe(2);
      const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
      expect(output).toContain("Delete confirmation required");
      expect(output).toContain(`worktree: ${bubble.paths.worktreePath}`);
      expect(output).toContain(`branch: ${bubble.config.bubble_branch}`);
      expect(output).not.toContain("tmux session:");
      expect(output).not.toContain("runtime session entry:");
      expect(output).toContain("Re-run with --force");
    } finally {
      process.env.PATH = originalPath;
    }
  });
});
