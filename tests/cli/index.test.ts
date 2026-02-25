import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../../src/cli/index.js";
import { setupRunningBubbleFixture } from "../helpers/bubble.js";
import { initGitRepository } from "../helpers/git.js";

describe("runCli", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const tempDirs: string[] = [];

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

  it("supports top-level pass help", async () => {
    const exitCode = await runCli(["pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports agent pass namespace", async () => {
    const exitCode = await runCli(["agent", "pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports top-level ask-human help", async () => {
    const exitCode = await runCli(["ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports agent ask-human namespace", async () => {
    const exitCode = await runCli(["agent", "ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
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

  it("supports bubble resume help", async () => {
    const exitCode = await runCli(["bubble", "resume", "--help"]);

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

  it("supports bubble merge help", async () => {
    const exitCode = await runCli(["bubble", "merge", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports top-level converged help", async () => {
    const exitCode = await runCli(["converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports agent converged namespace", async () => {
    const exitCode = await runCli(["agent", "converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
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

  it("rejects unknown agent namespace command", async () => {
    const exitCode = await runCli(["agent", "unknown"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("rejects unknown bubble subcommand", async () => {
    const exitCode = await runCli(["bubble", "unknown"]);

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
    expect(errorText).toContain("agent converged");
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
