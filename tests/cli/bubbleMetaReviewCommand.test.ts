import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions,
  renderMetaReviewLastReportText,
  renderMetaReviewRunText,
  renderMetaReviewStatusText,
  runBubbleMetaReviewCommand
} from "../../src/cli/commands/bubble/metaReview.js";
import { MetaReviewError } from "../../src/core/bubble/metaReview.js";
import { initGitRepository } from "../helpers/git.js";
import { setupRunningBubbleFixture } from "../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-cli-meta-review-"));
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

describe("parseBubbleMetaReviewCommandOptions", () => {
  it("parses run options with depth/json", () => {
    const parsed = parseBubbleMetaReviewCommandOptions([
      "run",
      "--id",
      "b_meta_cli_01",
      "--repo",
      "/tmp/repo",
      "--depth",
      "deep",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help || parsed.command !== "run") {
      throw new Error("Expected run command options.");
    }

    expect(parsed.id).toBe("b_meta_cli_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.depth).toBe("deep");
    expect(parsed.json).toBe(true);
  });

  it("parses status options with verbose", () => {
    const parsed = parseBubbleMetaReviewCommandOptions([
      "status",
      "--id",
      "b_meta_cli_02",
      "--verbose"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help || parsed.command !== "status") {
      throw new Error("Expected status command options.");
    }

    expect(parsed.id).toBe("b_meta_cli_02");
    expect(parsed.verbose).toBe(true);
  });

  it("returns help mode when missing subcommand", () => {
    const parsed = parseBubbleMetaReviewCommandOptions([]);
    expect(parsed).toEqual({ help: true });
  });

  it("supports help flag", () => {
    const parsed = parseBubbleMetaReviewCommandOptions(["--help"]);
    expect(parsed).toEqual({ help: true });
    expect(getBubbleMetaReviewHelpText()).toContain("pairflow bubble meta-review");
  });

  it("rejects unknown subcommands", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions(["unknown", "--id", "b_meta_cli_03"])
    ).toThrow(/Unknown meta-review subcommand/u);
  });

  it("rejects invalid depth values", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "run",
        "--id",
        "b_meta_cli_04",
        "--depth",
        "extreme"
      ])
    ).toThrow(/Invalid --depth value/u);
  });

  it("rejects --depth for non-run subcommands", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "status",
        "--id",
        "b_meta_cli_05",
        "--depth",
        "deep"
      ])
    ).toThrow(/--depth is only supported for meta-review run/u);
  });

  it("rejects --depth for last-report subcommand", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "last-report",
        "--id",
        "b_meta_cli_05b",
        "--depth",
        "deep"
      ])
    ).toThrow(/--depth is only supported for meta-review run/u);
  });

  it("requires --id and throws typed schema-invalid error", () => {
    let thrown: unknown;
    try {
      parseBubbleMetaReviewCommandOptions(["status"]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MetaReviewError);
    if (!(thrown instanceof MetaReviewError)) {
      throw new Error("Expected MetaReviewError.");
    }
    expect(thrown.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
    expect(thrown.message).toContain("Missing required option: --id");
  });

  it("rejects empty --id value", () => {
    let thrown: unknown;
    try {
      parseBubbleMetaReviewCommandOptions([
        "status",
        "--id",
        "   "
      ]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MetaReviewError);
    if (!(thrown instanceof MetaReviewError)) {
      throw new Error("Expected MetaReviewError.");
    }
    expect(thrown.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
    expect(thrown.message).toContain("Invalid --id value");
  });
});

describe("runBubbleMetaReviewCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleMetaReviewCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("routes run/status/last-report commands", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_run_01",
      task: "CLI routing"
    });

    const runResult = await runBubbleMetaReviewCommand([
      "run",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(runResult).not.toBeNull();
    expect(runResult?.command).toBe("run");

    const statusResult = await runBubbleMetaReviewCommand([
      "status",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(statusResult).not.toBeNull();
    expect(statusResult?.command).toBe("status");

    const reportResult = await runBubbleMetaReviewCommand([
      "last-report",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(reportResult).not.toBeNull();
    expect(reportResult?.command).toBe("last-report");
  });

  it("supports pre-parsed options overload for status and last-report", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_run_02",
      task: "CLI parsed overload"
    });

    await runBubbleMetaReviewCommand({
      help: false,
      command: "run",
      id: bubble.bubbleId,
      repo: repoPath,
      depth: "standard",
      json: false,
      verbose: false
    });

    const statusResult = await runBubbleMetaReviewCommand({
      help: false,
      command: "status",
      id: bubble.bubbleId,
      repo: repoPath,
      json: false,
      verbose: false
    });
    expect(statusResult?.command).toBe("status");

    const reportResult = await runBubbleMetaReviewCommand({
      help: false,
      command: "last-report",
      id: bubble.bubbleId,
      repo: repoPath,
      json: false,
      verbose: false
    });
    expect(reportResult?.command).toBe("last-report");
  });

  it("maps missing bubble lookup failures to dedicated meta-review reason code", async () => {
    const repoPath = await createTempRepo();

    await expect(
      runBubbleMetaReviewCommand([
        "status",
        "--id",
        "b_meta_missing",
        "--repo",
        repoPath
      ])
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_BUBBLE_LOOKUP_FAILED"
    });
  });

  it("maps CLI parse errors to META_REVIEW_SCHEMA_INVALID", async () => {
    await expect(
      runBubbleMetaReviewCommand([
        "run",
        "--id",
        "b_meta_parse_invalid",
        "--depth",
        "extreme"
      ])
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });
});

describe("meta-review render helpers", () => {
  it("renders run output with warnings", () => {
    const rendered = renderMetaReviewRunText({
      bubbleId: "b_meta_cli_render_01",
      depth: "standard",
      run_id: "run_1",
      status: "error",
      recommendation: "inconclusive",
      summary: "Runner failed",
      report_ref: "artifacts/meta-review-last.md",
      rework_target_message: null,
      updated_at: "2026-03-08T12:00:00.000Z",
      lifecycle_state: "RUNNING",
      warnings: [
        {
          reason_code: "META_REVIEW_RUNNER_ERROR",
          message: "runner unavailable"
        }
      ]
    });

    expect(rendered).toContain("status=error");
    expect(rendered).toContain("Warnings: META_REVIEW_RUNNER_ERROR");
  });

  it("renders status output in compact and verbose modes", () => {
    const compact = renderMetaReviewStatusText(
      {
        bubbleId: "b_meta_cli_render_02",
        has_run: false,
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false,
        last_autonomous_run_id: null,
        last_autonomous_status: null,
        last_autonomous_recommendation: null,
        last_autonomous_summary: null,
        last_autonomous_report_ref: null,
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: null
      },
      false
    );

    expect(compact).toContain("has_run=no");
    expect(compact).toContain("Last autonomous status: -");

    const verbose = renderMetaReviewStatusText(
      {
        bubbleId: "b_meta_cli_render_03",
        has_run: true,
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: true,
        last_autonomous_run_id: "run_3",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Clean",
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message: "Optional hardening",
        last_autonomous_updated_at: "2026-03-08T12:05:00.000Z"
      },
      true
    );

    expect(verbose).toContain("Last run id: run_3");
    expect(verbose).toContain("Last rework target: Optional hardening");
  });

  it("renders last-report output with optional markdown payload", () => {
    const empty = renderMetaReviewLastReportText(
      {
        bubbleId: "b_meta_cli_render_04",
        has_report: false,
        report_ref: null,
        summary: null,
        updated_at: null,
        report_markdown: null
      },
      false
    );
    expect(empty).toContain("has_report=no");

    const verbose = renderMetaReviewLastReportText(
      {
        bubbleId: "b_meta_cli_render_05",
        has_report: true,
        report_ref: "artifacts/meta-review-last.md",
        summary: "Latest",
        updated_at: "2026-03-08T12:10:00.000Z",
        report_markdown: "# Latest Report\n\nAll good."
      },
      true
    );
    expect(verbose).toContain("has_report=yes");
    expect(verbose).toContain("# Latest Report");
  });
});
