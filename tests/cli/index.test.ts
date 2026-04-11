import { mkdtemp, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../../src/cli/index.js";
import { buildMetaReviewExecutionContext } from "../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  metaReviewExecutionContextToRunningContext
} from "../../src/v11/shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/v11/infrastructure/state/stateStore.js";
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

  async function seedMetaReviewSnapshotProjection(input: {
    repoPath: string;
    bubbleId: string;
    round?: number;
    runId?: string;
    summary?: string;
  }): Promise<void> {
    const statePath = join(
      input.repoPath,
      ".pairflow",
      "bubbles",
      input.bubbleId,
      "state.json"
    );
    const loaded = await readStateSnapshot(statePath);
    const round = input.round ?? loaded.state.round;
    const runId = input.runId ?? "run_meta_review_cli_seed_01";
    const updatedAt = "2026-03-08T12:50:00.000Z";
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: input.bubbleId,
      round,
      startedAt: "2026-03-08T12:49:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeStateSnapshot(
      statePath,
      {
        ...loaded.state,
        round,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-08T12:49:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          executionContext
        ),
        meta_review: {
          execution_context: executionContext,
          last_autonomous_run_id: runId,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary:
            input.summary ?? "Seeded meta-review snapshot for CLI projection tests.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: updatedAt,
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

    await writeFile(
      join(
        input.repoPath,
        ".pairflow",
        "bubbles",
        input.bubbleId,
        "artifacts",
        "meta-review-last.json"
      ),
      `${JSON.stringify(
        {
          bubble_id: input.bubbleId,
          run_id: runId,
          round,
          generated_at: updatedAt,
          depth: "standard",
          status: "success",
          recommendation: "approve",
          summary:
            input.summary ?? "Seeded meta-review snapshot for CLI projection tests.",
          report_ref: "artifacts/meta-review-last.json",
          report_json_ref: "artifacts/meta-review-last.json",
          rework_target_message: null,
          warnings: [],
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0,
            findings_claimed_open_total: 0,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 0
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

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
      "b_invalid_meta_review"
    ]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
    const stderrText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderrText).toContain("pairflow bubble meta-review run");
    expect(stderrText).toContain("was removed");
  });

  it("fails closed for removed meta-review run even when --help is present", async () => {
    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "run",
      "--help"
    ]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
    const stderrText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderrText).toContain("pairflow bubble meta-review run");
    expect(stderrText).toContain("was removed");
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdoutText).toBe("");
  });

  it("prints structured schema-invalid stderr format for meta-review parse errors", async () => {
    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "status",
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
    const parsed = JSON.parse(stdoutText) as {
      bubbleId: string;
      has_run: boolean;
      operator_surface: string;
      projection_freshness: string;
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_run).toBe(false);
    expect(parsed.operator_surface).toBe("projection_only");
    expect(parsed.projection_freshness).toBe("no_snapshot");
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

    await seedMetaReviewSnapshotProjection({
      repoPath,
      bubbleId: bubble.bubbleId,
      runId: "run_meta_review_cli_json_03",
      summary: "Seeded last-report projection."
    });
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
      operator_surface: string;
      projection_freshness: string;
      report_ref: string | null;
      report_json: Record<string, unknown> | null;
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_report).toBe(true);
    expect(parsed.operator_surface).toBe("projection_only");
    expect(parsed.projection_freshness).toBe("current_round");
    expect(parsed.report_ref).toBe("artifacts/meta-review-last.json");
    expect(parsed.report_json).toBeTruthy();
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
      operator_surface: string;
      projection_freshness: string;
      report_ref: string | null;
      report_json: Record<string, unknown> | null;
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_report).toBe(false);
    expect(parsed.operator_surface).toBe("projection_only");
    expect(parsed.projection_freshness).toBe("no_snapshot");
    expect(parsed.report_ref).toBeNull();
    expect(parsed.report_json).toBeNull();
  });

  it("fails closed in meta-review last-report JSON when parity artifact round is ahead of the current bubble round", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-last-ahead-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_cli_json_04b",
      task: "meta-review json last-report ahead"
    });

    await seedMetaReviewSnapshotProjection({
      repoPath,
      bubbleId: bubble.bubbleId,
      runId: "run_meta_review_cli_json_04b",
      summary: "Seeded ahead projection."
    });
    stdoutSpy.mockClear();

    const artifactPath = join(
      repoPath,
      ".pairflow",
      "bubbles",
      bubble.bubbleId,
      "artifacts",
      "meta-review-last.json"
    );
    const artifactRaw = await readFile(artifactPath, "utf8");
    const artifact = JSON.parse(artifactRaw) as Record<string, unknown>;
    artifact.round = 9;
    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

    const statePath = join(repoPath, ".pairflow", "bubbles", bubble.bubbleId, "state.json");
    const loaded = await readStateSnapshot(statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot before ahead-round mutation.");
    }
    const nextExecutionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: 4,
      startedAt: "2026-03-08T12:49:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeStateSnapshot(
      statePath,
      {
        ...loaded.state,
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-08T12:49:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          nextExecutionContext
        ),
        meta_review: {
          ...loaded.state.meta_review,
          execution_context: nextExecutionContext
        },
        round: 4
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

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
      operator_surface: string;
      projection_freshness: string;
      report_ref: string | null;
      report_json: Record<string, unknown> | null;
      parity_diagnostics: string[];
    };
    expect(parsed.bubbleId).toBe(bubble.bubbleId);
    expect(parsed.has_report).toBe(false);
    expect(parsed.operator_surface).toBe("projection_only");
    expect(parsed.projection_freshness).toBe("ahead");
    expect(parsed.report_ref).toBeNull();
    expect(parsed.report_json).toBeNull();
    expect(parsed.parity_diagnostics).toEqual([
      "META_REVIEW_SNAPSHOT_ROUND_AHEAD:snapshot_round=9;current_round=4"
    ]);
  });

  it("renders removed meta-review recover as explicit invalid subcommand", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-json-recover-"));
    tempDirs.push(repoPath);
    await initGitRepository(repoPath);
    const exitCode = await runCli([
      "bubble",
      "meta-review",
      "recover",
      "--id",
      "b_meta_review_cli_json_05",
      "--repo",
      repoPath,
      "--json"
    ]);

    expect(exitCode).toBe(1);
    const stdoutText = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderrText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdoutText).toBe("");
    expect(stderrText).toContain("reason_code=META_REVIEW_SCHEMA_INVALID");
    expect(stderrText).toContain("pairflow bubble meta-review recover");
    expect(stderrText).toContain("no longer supported");
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
