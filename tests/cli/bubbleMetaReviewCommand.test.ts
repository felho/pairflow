import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildMetaReviewSubmitUsageLine } from "../../src/v11/shared/metaReview/metaReviewSubmitGuidance.js";
import {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions,
  renderMetaReviewLastReportText,
  renderMetaReviewRecoverText,
  renderMetaReviewSubmitText,
  renderMetaReviewStatusText,
  runBubbleMetaReviewCommand
} from "../../src/cli/commands/bubble/metaReview.js";
import { formatMetaReviewProjectionFreshness } from "../../src/v11/application/metaReview/metaReviewCliRenderersHelpers.js";
import { buildMetaReviewExecutionContext } from "../../src/core/bubble/metaReviewExecutionContext.js";
import { MetaReviewError } from "../../src/core/bubble/metaReview.js";
import {
  metaReviewExecutionContextToRunningContext
} from "../../src/v11/shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/v11/infrastructure/state/stateStore.js";
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
  it("rejects removed run subcommand with explicit guidance", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "run",
        "--id",
        "b_meta_cli_removed_run_01",
        "--repo",
        "/tmp/repo"
      ])
    ).toThrow(/pairflow bubble meta-review run` was removed/u);
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
    expect(getBubbleMetaReviewHelpText()).toContain(
      "Operator projection/recovery commands"
    );
    expect(getBubbleMetaReviewHelpText()).toContain(
      "pairflow agent emit --kind meta_review_result"
    );
    expect(getBubbleMetaReviewHelpText()).toContain(
      "Legacy `pairflow bubble meta-review submit` was removed"
    );
    expect(getBubbleMetaReviewHelpText()).toContain(
      "`status` and `last-report` are read-only projections"
    );
    expect(getBubbleMetaReviewHelpText()).toContain(
      "`pairflow bubble meta-review run` was removed"
    );
    expect(getBubbleMetaReviewHelpText()).toContain(buildMetaReviewSubmitUsageLine());
    expect(getBubbleMetaReviewHelpText()).not.toContain("--depth");
    expect(getBubbleMetaReviewHelpText()).not.toContain("--report-markdown");
  });

  it("fails closed for removed run subcommand even when --help is present", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "run",
        "--help"
      ])
    ).toThrow(/pairflow bubble meta-review run` was removed/u);
  });

  it("rejects unknown subcommands", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions(["unknown", "--id", "b_meta_cli_03"])
    ).toThrow(/Unknown meta-review subcommand/u);
  });

  it("rejects legacy submit subcommand with migration guidance", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions(["submit", "--id", "b_meta_cli_submit_legacy_01"])
    ).toThrow(/pairflow agent emit --kind meta_review_result/u);
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

  it("rejects removed run subcommand even when --depth is present", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "run",
        "--id",
        "b_meta_cli_04",
        "--depth",
        "extreme"
      ])
    ).toThrow(/pairflow bubble meta-review run` was removed/u);
  });

  it("rejects --depth for retained status subcommand with removal guidance", () => {
    expect(() =>
      parseBubbleMetaReviewCommandOptions([
        "status",
        "--id",
        "b_meta_cli_05",
        "--depth",
        "deep"
      ])
    ).toThrow(/--depth` is no longer supported/u);
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
    ).toThrow(/--depth` is no longer supported/u);
  });

  it.each([
    "status",
    "last-report",
    "recover"
  ])(
    "rejects submit-only flags for retained %s subcommand with canonical actor guidance",
    (subcommand) => {
      expect(() =>
        parseBubbleMetaReviewCommandOptions([
          subcommand,
          "--id",
          "b_meta_cli_submit_only_flags_01",
          "--round",
          "1",
          "--recommendation",
          "approve",
          "--summary",
          "Should be rejected on retained operator command",
          "--rework-target-message",
          "Not allowed here",
          "--report-json",
          "{\"findings_claim_state\":\"clean\",\"findings_claim_source\":\"meta_review_artifact\",\"findings_count\":0}"
        ])
      ).toThrow(/pairflow agent emit --kind meta_review_result/u);
    }
  );

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

  it("routes status/last-report/recover commands", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_run_01",
      task: "CLI routing"
    });

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
        state: "RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        execution_context: metaReviewExecutionContextToRunningContext(
          buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-08T12:29:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          })
        ),
        meta_review: {
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-08T12:29:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          }),
          last_autonomous_run_id: "run_meta_cli_recover_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered via CLI routing test.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
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
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-12T12:36:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-12T12:36:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          })
        ),
        meta_review: {
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-12T12:36:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          }),
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
    expect(reportResult.lastReport.report_ref).toBe("artifacts/meta-review-last.json");
    expect(reportResult.lastReport.report_json).toBeTruthy();
  });

  it("supports pre-parsed options overload for status/last-report/recover", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_cli_run_02",
      task: "CLI parsed overload"
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
        state: "RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        execution_context: metaReviewExecutionContextToRunningContext(
          buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-08T12:34:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          })
        ),
        meta_review: {
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-08T12:34:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          }),
          last_autonomous_run_id: "run_meta_cli_recover_02",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Recovered via parsed overload test.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
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
        "status",
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
      "findings_advisory_open_total",
      "findings_artifact_open_total",
      "findings_artifact_status",
      "findings_blocking_open_total",
      "findings_claimed_open_total",
      "findings_digest_sha256",
      "findings_parity_status",
      "has_run",
      "last_autonomous_recommendation",
      "last_autonomous_report_ref",
      "last_autonomous_rework_target_message",
      "last_autonomous_run_id",
      "last_autonomous_status",
      "last_autonomous_summary",
      "last_autonomous_updated_at",
      "meta_review_run_id",
      "operator_surface",
      "parity_diagnostics",
      "projection_freshness",
      "sticky_human_gate"
    ]);

    expect(reportResult?.command).toBe("last-report");
    if (reportResult?.command !== "last-report") {
      throw new Error("Expected last-report command result.");
    }
    expect(Object.keys(reportResult.lastReport).sort()).toEqual([
      "bubbleId",
      "findings_advisory_open_total",
      "findings_artifact_open_total",
      "findings_artifact_status",
      "findings_blocking_open_total",
      "findings_claimed_open_total",
      "findings_digest_sha256",
      "findings_parity_status",
      "has_report",
      "meta_review_run_id",
      "operator_surface",
      "parity_diagnostics",
      "projection_freshness",
      "report_json",
      "report_ref",
      "summary",
      "updated_at"
    ]);
  });
});

describe("meta-review render helpers", () => {
  it("renders submit output", () => {
    const rendered = renderMetaReviewSubmitText({
      bubbleId: "b_meta_cli_render_submit_01",
      run_id: "run_submit_1",
      status: "success",
      recommendation: "approve",
      summary: "Structured submit summary",
      report_ref: "artifacts/meta-review-last.json",
      rework_target_message: null,
      updated_at: "2026-03-10T09:15:00.000Z",
      lifecycle_state: "READY_FOR_HUMAN_APPROVAL",
      gate_route: "human_gate_approve",
      gate_sequence: 12,
      gate_envelope_type: "APPROVAL_REQUEST",
      report_json: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_parity_status: "ok"
      },
      warnings: []
    });

    expect(rendered).toContain("Meta-review submit for");
    expect(rendered).toContain("status=success");
    expect(rendered).toContain("Gate route: human_gate_approve");
    expect(rendered).toContain("Lifecycle state: READY_FOR_HUMAN_APPROVAL");
    expect(rendered).toContain("Findings parity: claimed=0, artifact=0, status=ok");
  });

  it("renders status output in compact and verbose modes", () => {
    const compact = renderMetaReviewStatusText(
      {
        bubbleId: "b_meta_cli_render_02",
        has_run: false,
        operator_surface: "projection_only",
        projection_freshness: "no_snapshot",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false,
        last_autonomous_run_id: null,
        last_autonomous_status: null,
        last_autonomous_recommendation: null,
        last_autonomous_summary: null,
        last_autonomous_report_ref: null,
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: null,
        findings_claimed_open_total: null,
        findings_artifact_open_total: null,
        findings_blocking_open_total: null,
        findings_advisory_open_total: null,
        findings_artifact_status: null,
        findings_digest_sha256: null,
        meta_review_run_id: null,
        findings_parity_status: null,
        parity_diagnostics: []
      },
      false
    );

    expect(compact).toContain("has_run=no");
    expect(compact).toContain("freshness=no_snapshot");
    expect(compact).toContain("projection-only read path");
    expect(compact).toContain("Last autonomous status: -");

    const verbose = renderMetaReviewStatusText(
      {
        bubbleId: "b_meta_cli_render_03",
        has_run: true,
        operator_surface: "projection_only",
        projection_freshness: "current_round",
        auto_rework_count: 1,
        auto_rework_limit: 5,
        sticky_human_gate: true,
        last_autonomous_run_id: "run_3",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Clean",
        last_autonomous_report_ref: "artifacts/meta-review-last.json",
        last_autonomous_rework_target_message: "Optional hardening",
        last_autonomous_updated_at: "2026-03-08T12:05:00.000Z",
        findings_claimed_open_total: 1,
        findings_artifact_open_total: 1,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 1,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        meta_review_run_id: "run_3",
        findings_parity_status: "ok",
        parity_diagnostics: []
      },
      true
    );

    expect(verbose).toContain("Last run id: run_3");
    expect(verbose).toContain("Last rework target: Optional hardening");
  });

  it("renders last-report output without embedded markdown payload", () => {
    const empty = renderMetaReviewLastReportText(
      {
        bubbleId: "b_meta_cli_render_04",
        has_report: false,
        operator_surface: "projection_only",
        projection_freshness: "no_snapshot",
        report_ref: null,
        summary: null,
        updated_at: null,
        report_json: null,
        findings_claimed_open_total: null,
        findings_artifact_open_total: null,
        findings_blocking_open_total: null,
        findings_advisory_open_total: null,
        findings_artifact_status: null,
        findings_digest_sha256: null,
        meta_review_run_id: null,
        findings_parity_status: null,
        parity_diagnostics: []
      },
      false
    );
    expect(empty).toContain("has_report=no");
    expect(empty).toContain("freshness=no_snapshot");
    expect(empty).toContain("projection-only read path");

    const verbose = renderMetaReviewLastReportText(
      {
        bubbleId: "b_meta_cli_render_05",
        has_report: true,
        operator_surface: "projection_only",
        projection_freshness: "current_round",
        report_ref: "artifacts/meta-review-last.json",
        summary: "Latest",
        updated_at: "2026-03-08T12:10:00.000Z",
        report_json: { findings_count: 0 },
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        meta_review_run_id: "run_last_report_1",
        findings_parity_status: "ok",
        parity_diagnostics: []
      },
      true
    );
    expect(verbose).toContain("has_report=yes");
    expect(verbose).toContain("Report ref: artifacts/meta-review-last.json");
  });

  it("renders parity diagnostics when present", () => {
    const statusRendered = renderMetaReviewStatusText(
      {
        bubbleId: "b_meta_cli_render_diag_01",
        has_run: true,
        operator_surface: "projection_only",
        projection_freshness: "ahead",
        auto_rework_count: 0,
        auto_rework_limit: 5,
        sticky_human_gate: false,
        last_autonomous_run_id: "run_diag_01",
        last_autonomous_status: "success",
        last_autonomous_recommendation: "approve",
        last_autonomous_summary: "Summary",
        last_autonomous_report_ref: "artifacts/meta-review-last.json",
        last_autonomous_rework_target_message: null,
        last_autonomous_updated_at: "2026-03-08T12:12:00.000Z",
        findings_claimed_open_total: null,
        findings_artifact_open_total: null,
        findings_blocking_open_total: null,
        findings_advisory_open_total: null,
        findings_artifact_status: null,
        findings_digest_sha256: null,
        meta_review_run_id: null,
        findings_parity_status: null,
        parity_diagnostics: [
          "META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED",
          "META_REVIEW_SNAPSHOT_ROUND_AHEAD:snapshot_round=11;current_round=3"
        ]
      },
      false
    );
    expect(statusRendered).toContain(
      "freshness=ahead"
    );
    expect(statusRendered).toContain(
      "Parity diagnostics: META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED"
    );
    expect(statusRendered).toContain(
      "META_REVIEW_SNAPSHOT_ROUND_AHEAD:snapshot_round=11;current_round=3"
    );

    const reportRendered = renderMetaReviewLastReportText(
      {
        bubbleId: "b_meta_cli_render_diag_02",
        has_report: true,
        operator_surface: "projection_only",
        projection_freshness: "unknown",
        report_ref: "artifacts/meta-review-last.json",
        summary: "Summary",
        updated_at: "2026-03-08T12:12:10.000Z",
        report_json: null,
        findings_claimed_open_total: null,
        findings_artifact_open_total: null,
        findings_blocking_open_total: null,
        findings_advisory_open_total: null,
        findings_artifact_status: null,
        findings_digest_sha256: null,
        meta_review_run_id: null,
        findings_parity_status: null,
        parity_diagnostics: [
          "META_REVIEW_PARITY_ARTIFACT_READ_FAILED:EACCES",
          "META_REVIEW_SNAPSHOT_ROUND_STALE:snapshot_round=2;current_round=4"
        ]
      },
      false
    );
    expect(reportRendered).toContain(
      "Parity diagnostics: META_REVIEW_PARITY_ARTIFACT_READ_FAILED:EACCES"
    );
    expect(reportRendered).toContain(
      "META_REVIEW_SNAPSHOT_ROUND_STALE:snapshot_round=2;current_round=4"
    );
  });

  it("fails loudly for unexpected projection freshness values", () => {
    expect(() =>
      formatMetaReviewProjectionFreshness("future_round" as never)
    ).toThrow(/META_REVIEW_PROJECTION_FRESHNESS_UNEXPECTED/u);
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
        refs: ["artifacts/meta-review-last.json"]
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
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T12:39:00.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: true
        }
      }
    });

    expect(rendered).toContain("route=human_gate_approve");
    expect(rendered).toContain("snapshot-route replay only");
    expect(rendered).toContain("APPROVAL_REQUEST msg_meta_recover_01");
    expect(rendered).toContain("READY_FOR_HUMAN_APPROVAL");
  });
});
