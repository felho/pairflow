import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../../src/cli/index.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/core/state/stateStore.js";
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

  it("supports bubble meta-review help", async () => {
    const exitCode = await runCli(["bubble", "meta-review", "--help"]);

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
  });

  it("rejects unknown bubble subcommand", async () => {
    const exitCode = await runCli(["bubble", "unknown"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
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

  it("returns non-zero for invalid bubble meta-review options", async () => {
    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "run",
      "--id",
      "b_invalid_meta_review",
      "--depth",
      "extreme"
    ]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("prints structured schema-invalid stderr format for meta-review parse errors", async () => {
    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "run",
      "--id",
      "b_invalid_meta_review_schema",
      "--depth",
      "extreme"
    ]);

    expect(exitCode).toBe(1);
    const stderrText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderrText).toContain(
      "meta_review_error reason_code=META_REVIEW_SCHEMA_INVALID message="
    );
  });

  it("includes meta-review reason_code in stderr for typed command errors", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);

    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "status",
      "--id",
      "b_missing_meta_review",
      "--repo",
      repoPath
    ]);

    expect(exitCode).toBe(1);
    const stderrText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderrText).toContain(
      "meta_review_error reason_code=META_REVIEW_BUBBLE_LOOKUP_FAILED"
    );
  });

  it("renders meta-review status as JSON through runCli", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_cli_json_01",
      task: "meta-review json status"
    });

    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "status",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath,
      "--json"
    ]);

    expect(exitCode).toBe(0);
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const parsed = JSON.parse(stdoutText) as { bubbleId: string; has_run: boolean };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_run).toBe(false);
  });

  it("renders meta-review run as JSON through runCli", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-run-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_cli_json_02",
      task: "meta-review json run"
    });

    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "run",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath,
      "--json"
    ]);

    expect(exitCode).toBe(0);
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const parsed = JSON.parse(stdoutText) as {
      bubbleId: string;
      run_id: string;
      status: string;
      recommendation: string;
      report_ref: string;
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.run_id.length).toBeGreaterThan(0);
    expect(parsed.status).toBe("error");
    expect(parsed.recommendation).toBe("inconclusive");
    expect(parsed.report_ref).toBe("artifacts/meta-review-last.md");
  });

  it("renders meta-review last-report as JSON through runCli", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-last-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_cli_json_03",
      task: "meta-review json last-report"
    });

    const runExitCode = await runCli([
      "bubble",
      "meta-review",
      "run",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(runExitCode).toBe(0);
    stdoutSpy.mockClear();

    const lastReportExitCode = await runCli([
      "bubble",
      "meta-review",
      "last-report",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath,
      "--json"
    ]);

    expect(lastReportExitCode).toBe(0);
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const parsed = JSON.parse(stdoutText) as {
      bubbleId: string;
      has_report: boolean;
      report_ref: string | null;
      report_markdown: string | null;
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_report).toBe(true);
    expect(parsed.report_ref).toBe("artifacts/meta-review-last.md");
    expect(typeof parsed.report_markdown).toBe("string");
  });

  it("renders meta-review last-report no-report JSON through runCli", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-last-empty-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_cli_json_04",
      task: "meta-review json last-report empty"
    });

    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "last-report",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath,
      "--json"
    ]);

    expect(exitCode).toBe(0);
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const parsed = JSON.parse(stdoutText) as {
      bubbleId: string;
      has_report: boolean;
      report_ref: string | null;
      report_markdown: string | null;
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_report).toBe(false);
    expect(parsed.report_ref).toBeNull();
    expect(parsed.report_markdown).toBeNull();
  });

  it("renders meta-review recover as JSON through runCli", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-recover-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_cli_json_05",
      task: "meta-review json recover"
    });

    const loaded = await readStateSnapshot(join(
      repoPath,
      ".pairflow",
      "bubbles",
      bubble.bubbleId,
      "state.json"
    ));
    await writeStateSnapshot(
      join(repoPath, ".pairflow", "bubbles", bubble.bubbleId, "state.json"),
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-08T12:49:00.000Z",
        meta_review: {
          last_autonomous_run_id: "run_meta_review_cli_json_05",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered from CLI JSON test.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T12:50:00.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "recover",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath,
      "--json"
    ]);

    expect(exitCode).toBe(0);
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const parsed = JSON.parse(stdoutText) as {
      bubbleId: string;
      route: string;
      gateEnvelope: { type: string };
      state: { state: string };
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.route).toBe("human_gate_approve");
    expect(parsed.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(parsed.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
  });

  it("prints registry-backed unknown command support list", async () => {
    const exitCode = await runCli(["unknown"]);

    expect(exitCode).toBe(1);
    const errorText = stderrSpy.mock.calls.map((call) => call[0]).join("");
    expect(errorText).toContain("ui");
    expect(errorText).toContain("bubble watchdog");
    expect(errorText).toContain("repo list");
    expect(errorText).toContain("metrics report");
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
