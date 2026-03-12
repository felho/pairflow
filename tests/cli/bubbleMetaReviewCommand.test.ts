import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions,
  renderMetaReviewLastReportText,
  renderMetaReviewRecoverText,
  renderMetaReviewRunText,
  renderMetaReviewSubmitText,
  renderMetaReviewStatusText,
  runBubbleMetaReviewCommand
} from "../../src/cli/commands/bubble/metaReview.js";
import { MetaReviewError } from "../../src/core/bubble/metaReview.js";
import { applyStateTransition } from "../../src/core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/core/state/stateStore.js";
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

async function prepareMetaReviewSubmitReadyFixture(input: {
  statePath: string;
  sessionsPath: string;
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
}): Promise<void> {
  const transitionTimestamp = "2026-03-10T09:00:00.000Z";
  let current = await readStateSnapshot(input.statePath);

  if (current.state.state !== "RUNNING" && current.state.state !== "READY_FOR_APPROVAL") {
    const runningState = applyStateTransition(current.state, {
      to: "RUNNING",
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: transitionTimestamp,
      lastCommandAt: transitionTimestamp
    });
    current = await writeStateSnapshot(input.statePath, runningState, {
      expectedFingerprint: current.fingerprint,
      expectedState: current.state.state
    });
  }

  if (current.state.state !== "READY_FOR_APPROVAL") {
    const readyForApprovalState = applyStateTransition(current.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: transitionTimestamp
    });
    current = await writeStateSnapshot(
      input.statePath,
      readyForApprovalState,
      {
        expectedFingerprint: current.fingerprint,
        expectedState: current.state.state
      }
    );
  }

  const metaReviewRunningState = applyStateTransition(current.state, {
    to: "META_REVIEW_RUNNING",
    activeAgent: "codex",
    activeRole: "meta_reviewer",
    activeSince: transitionTimestamp,
    lastCommandAt: transitionTimestamp
  });
  await writeStateSnapshot(
    input.statePath,
    metaReviewRunningState,
    {
      expectedFingerprint: current.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    }
  );

  await mkdir(join(input.repoPath, ".pairflow", "runtime"), { recursive: true });
  await writeFile(
    input.sessionsPath,
    `${JSON.stringify(
      {
        [input.bubbleId]: {
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          worktreePath: input.worktreePath,
          tmuxSessionName: "pf_cli_meta_submit",
          updatedAt: "2026-03-10T09:00:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 3,
            active: true,
            runId: "run_meta_cli_submit",
            updatedAt: "2026-03-10T09:00:00.000Z"
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

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

  it("parses submit options with structured payload fields", () => {
    const parsed = parseBubbleMetaReviewCommandOptions([
      "submit",
      "--id",
      "b_meta_cli_submit_01",
      "--round",
      "2",
      "--recommendation",
      "approve",
      "--summary",
      "Structured submit summary",
      "--report-markdown",
      "# Report",
      "--report-json",
      "{\"findings\":0}"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help || parsed.command !== "submit") {
      throw new Error("Expected submit command options.");
    }

    expect(parsed.round).toBe(2);
    expect(parsed.recommendation).toBe("approve");
    expect(parsed.summary).toBe("Structured submit summary");
    expect(parsed.reportMarkdown).toBe("# Report");
    expect(parsed.reportJson).toEqual({ findings: 0 });
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

  it("parses recover options", () => {
    const parsed = parseBubbleMetaReviewCommandOptions([
      "recover",
      "--id",
      "b_meta_cli_recover_01"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help || parsed.command !== "recover") {
      throw new Error("Expected recover command options.");
    }

    expect(parsed.id).toBe("b_meta_cli_recover_01");
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

  it("routes run/status/last-report/recover commands", async () => {
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

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        meta_review: {
          last_autonomous_run_id: "run_meta_cli_recover_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered via CLI routing test.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T12:30:00.000Z",
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

    const recoverResult = await runBubbleMetaReviewCommand([
      "recover",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(recoverResult).not.toBeNull();
    expect(recoverResult?.command).toBe("recover");
  });

  it("keeps recover persistence visible in status and last-report output", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_recover_persist_01",
      task: "CLI recover persistence visibility"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-12T12:36:00.000Z",
        meta_review: {
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
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

    const recoverResult = await runBubbleMetaReviewCommand([
      "recover",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(recoverResult?.command).toBe("recover");
    if (recoverResult?.command !== "recover") {
      throw new Error("Expected recover command result.");
    }
    expect(recoverResult.recover.route).toBe("human_gate_run_failed");

    const statusResult = await runBubbleMetaReviewCommand([
      "status",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(statusResult?.command).toBe("status");
    if (statusResult?.command !== "status") {
      throw new Error("Expected status command result.");
    }
    expect(statusResult.status.has_run).toBe(true);

    const reportResult = await runBubbleMetaReviewCommand([
      "last-report",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    expect(reportResult?.command).toBe("last-report");
    if (reportResult?.command !== "last-report") {
      throw new Error("Expected last-report command result.");
    }
    expect(reportResult.lastReport.has_report).toBe(true);
    expect(reportResult.lastReport.report_ref).toBe("artifacts/meta-review-last.md");
    expect(reportResult.lastReport.report_markdown).toContain("# Meta Review Report");
  });

  it("routes structured submit command and persists canonical snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_submit_run_01",
      task: "CLI submit routing"
    });

    await prepareMetaReviewSubmitReadyFixture({
      statePath: bubble.paths.statePath,
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath
    });

    const result = await runBubbleMetaReviewCommand([
      "submit",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath,
      "--round",
      "1",
      "--recommendation",
      "approve",
      "--summary",
      "Structured CLI submit summary.",
      "--report-markdown",
      "# CLI Submit\n\nLooks good."
    ]);

    expect(result?.command).toBe("submit");
    if (result?.command !== "submit") {
      throw new Error("Expected submit command result.");
    }
    expect(result.submit.recommendation).toBe("approve");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review?.last_autonomous_recommendation).toBe(
      "approve"
    );
    expect(loaded.state.meta_review?.last_autonomous_summary).toBe(
      "Structured CLI submit summary."
    );
  });

  it("supports pre-parsed options overload for status/last-report/recover", async () => {
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

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        meta_review: {
          last_autonomous_run_id: "run_meta_cli_recover_02",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered via parsed overload test.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T12:35:00.000Z",
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

    const recoverResult = await runBubbleMetaReviewCommand({
      help: false,
      command: "recover",
      id: bubble.bubbleId,
      repo: repoPath,
      json: false,
      verbose: false
    });
    expect(recoverResult?.command).toBe("recover");

    const afterRecover = await readStateSnapshot(bubble.paths.statePath);
    if (afterRecover.state.meta_review === undefined) {
      throw new Error("Expected meta_review after recover.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...afterRecover.state,
        meta_review: {
          ...afterRecover.state.meta_review,
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null
        }
      },
      {
        expectedFingerprint: afterRecover.fingerprint,
        expectedState: afterRecover.state.state
      }
    );

    await prepareMetaReviewSubmitReadyFixture({
      statePath: bubble.paths.statePath,
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath
    });
    const submitResult = await runBubbleMetaReviewCommand({
      help: false,
      command: "submit",
      id: bubble.bubbleId,
      repo: repoPath,
      round: 1,
      recommendation: "approve",
      summary: "Parsed overload submit",
      reportMarkdown: "# Parsed overload",
      reworkTargetMessage: null,
      json: false,
      verbose: false
    });
    expect(submitResult?.command).toBe("submit");
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

  it("keeps status/last-report output shapes stable without state mutation", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_shape_01",
      task: "CLI shape stability"
    });

    const before = await readStateSnapshot(bubble.paths.statePath);
    const statusResult = await runBubbleMetaReviewCommand([
      "status",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    const reportResult = await runBubbleMetaReviewCommand([
      "last-report",
      "--id",
      bubble.bubbleId,
      "--repo",
      repoPath
    ]);
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(before.fingerprint).toBe(after.fingerprint);
    expect(statusResult?.command).toBe("status");
    if (statusResult?.command !== "status") {
      throw new Error("Expected status command result.");
    }
    expect(Object.keys(statusResult.status).sort()).toEqual([
      "auto_rework_count",
      "auto_rework_limit",
      "bubbleId",
      "has_run",
      "last_autonomous_recommendation",
      "last_autonomous_report_ref",
      "last_autonomous_rework_target_message",
      "last_autonomous_run_id",
      "last_autonomous_status",
      "last_autonomous_summary",
      "last_autonomous_updated_at",
      "sticky_human_gate"
    ]);

    expect(reportResult?.command).toBe("last-report");
    if (reportResult?.command !== "last-report") {
      throw new Error("Expected last-report command result.");
    }
    expect(Object.keys(reportResult.lastReport).sort()).toEqual([
      "bubbleId",
      "has_report",
      "report_markdown",
      "report_ref",
      "summary",
      "updated_at"
    ]);
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

  it("renders submit output", () => {
    const rendered = renderMetaReviewSubmitText({
      bubbleId: "b_meta_cli_render_submit_01",
      run_id: "run_submit_1",
      status: "success",
      recommendation: "approve",
      summary: "Structured submit summary",
      report_ref: "artifacts/meta-review-last.md",
      rework_target_message: null,
      updated_at: "2026-03-10T09:15:00.000Z",
      lifecycle_state: "META_REVIEW_RUNNING",
      warnings: []
    });

    expect(rendered).toContain("Meta-review submit for");
    expect(rendered).toContain("status=success");
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

  it("renders recover output", () => {
    const rendered = renderMetaReviewRecoverText({
      bubbleId: "b_meta_cli_render_recover_01",
      route: "human_gate_approve",
      gateSequence: 42,
      gateEnvelope: {
        id: "msg_meta_recover_01",
        ts: "2026-03-08T12:40:00.000Z",
        bubble_id: "b_meta_cli_render_recover_01",
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 4,
        payload: {
          summary: "Recovered summary."
        },
        refs: ["artifacts/meta-review-last.md"]
      },
      state: {
        bubble_id: "b_meta_cli_render_recover_01",
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 4,
        active_agent: null,
        active_since: null,
        active_role: null,
        round_role_history: [],
        last_command_at: "2026-03-08T12:40:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: [],
        meta_review: {
          last_autonomous_run_id: "run_meta_cli_render_recover_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered summary.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T12:39:00.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: true
        }
      }
    });

    expect(rendered).toContain("route=human_gate_approve");
    expect(rendered).toContain("APPROVAL_REQUEST msg_meta_recover_01");
    expect(rendered).toContain("READY_FOR_HUMAN_APPROVAL");
  });
});
