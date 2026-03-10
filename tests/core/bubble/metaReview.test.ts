import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getBubbleInbox } from "../../../src/core/bubble/inboxBubble.js";
import { getBubblePaths } from "../../../src/core/bubble/paths.js";
import { getBubbleStatus } from "../../../src/core/bubble/statusBubble.js";
import {
  extractMetaReviewDelimitedBlock,
  MetaReviewError,
  getMetaReviewLastReport,
  getMetaReviewStatus,
  parseMetaReviewRunnerOutput,
  runMetaReview,
  toMetaReviewError
} from "../../../src/core/bubble/metaReview.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
import {
  type LoadedStateSnapshot,
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { SchemaValidationError } from "../../../src/core/validation.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-meta-review-"));
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

describe("meta-review paths", () => {
  it("exposes rolling artifact paths", () => {
    const paths = getBubblePaths("/tmp/repo", "b_meta_review_path_01");

    expect(paths.metaReviewLastJsonArtifactPath).toBe(
      "/tmp/repo/.pairflow/bubbles/b_meta_review_path_01/artifacts/meta-review-last.json"
    );
    expect(paths.metaReviewLastMarkdownArtifactPath).toBe(
      "/tmp/repo/.pairflow/bubbles/b_meta_review_path_01/artifacts/meta-review-last.md"
    );
  });
});

describe("meta-review run", () => {
  it("persists canonical snapshot and rolling artifacts on successful run", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_01",
      task: "Meta run"
    });

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        depth: "deep"
      },
      {
        randomUUID: () => "run_meta_01",
        now: new Date("2026-03-08T11:00:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "rework",
          summary: "Found deterministic drift",
          report_markdown: "# Report\n\nFix deterministic drift.",
          report_json: {
            findings: 1
          },
          rework_target_message: "Fix deterministic drift in command routing"
        })
      }
    );

    expect(result.status).toBe("success");
    expect(result.recommendation).toBe("rework");
    expect(result.run_id).toBe("run_meta_01");
    expect(result.warnings).toEqual([]);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
    expect(loaded.state.meta_review).toEqual({
      last_autonomous_run_id: "run_meta_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: "Found deterministic drift",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_rework_target_message:
        "Fix deterministic drift in command routing",
      last_autonomous_updated_at: "2026-03-08T11:00:00.000Z",
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false
    });

    const reportJson = JSON.parse(
      await readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ) as { recommendation: string; report_ref: string };
    const reportMarkdown = await readFile(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      "utf8"
    );

    expect(reportJson.recommendation).toBe("rework");
    expect(reportJson.report_ref).toBe("artifacts/meta-review-last.md");
    expect(reportMarkdown).toContain("Fix deterministic drift");
  });

  it("falls back to error/inconclusive when live runner fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_02",
      task: "Meta run fallback"
    });

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_02",
        now: new Date("2026-03-08T11:05:00.000Z"),
        runLiveReview: async () => {
          throw new Error("adapter unavailable");
        }
      }
    );

    expect(result.status).toBe("error");
    expect(result.recommendation).toBe("inconclusive");
    expect(result.warnings.map((entry) => entry.reason_code)).toContain(
      "META_REVIEW_RUNNER_ERROR"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review?.last_autonomous_status).toBe("error");
    expect(loaded.state.meta_review?.last_autonomous_recommendation).toBe(
      "inconclusive"
    );
    expect(loaded.state.meta_review?.last_autonomous_summary).toContain(
      "adapter unavailable"
    );
  });

  it("uses adapter-unavailable fail-safe when no live runner dependency is provided", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_default_unavailable",
      task: "Meta run default unavailable"
    });

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_default_unavailable",
        now: new Date("2026-03-08T11:06:00.000Z")
      }
    );

    expect(result.status).toBe("error");
    expect(result.recommendation).toBe("inconclusive");
    expect(result.summary).toContain("adapter is unavailable");
    expect(result.warnings.some((entry) => entry.reason_code === "META_REVIEW_RUNNER_ERROR")).toBe(true);
  });

  it("preserves structured MetaReviewError details when live runner fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_02b",
      task: "Meta run fallback structured"
    });

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_02b",
        now: new Date("2026-03-08T11:06:00.000Z"),
        runLiveReview: async () => {
          throw new MetaReviewError(
            "META_REVIEW_SCHEMA_INVALID_COMBINATION",
            "runner payload mismatch"
          );
        }
      }
    );

    expect(result.status).toBe("error");
    expect(result.recommendation).toBe("inconclusive");
    expect(result.summary).toContain(
      "META_REVIEW_SCHEMA_INVALID_COMBINATION"
    );
    const hasStructuredRunnerWarning = result.warnings.some(
      (entry) =>
        entry.reason_code === "META_REVIEW_RUNNER_ERROR" &&
        entry.message.includes("META_REVIEW_SCHEMA_INVALID_COMBINATION")
    );
    expect(hasStructuredRunnerWarning).toBe(true);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review?.last_autonomous_status).toBe("error");
    expect(loaded.state.meta_review?.last_autonomous_recommendation).toBe(
      "inconclusive"
    );
    expect(loaded.state.meta_review?.last_autonomous_summary).toContain(
      "META_REVIEW_SCHEMA_INVALID_COMBINATION"
    );
  });

  it("rejects rework recommendation without target message before write", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_03",
      task: "Meta run invariant"
    });

    const before = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          runLiveReview: async () => ({
            recommendation: "rework",
            summary: "needs fixes",
            report_markdown: "# Report"
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.fingerprint).toBe(before.fingerprint);
  });

  it("keeps only the latest snapshot/artifacts across consecutive runs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_04",
      task: "Meta run overwrite"
    });

    let runCounter = 0;
    const nextRunId = (): string => {
      runCounter += 1;
      return `run_meta_04_${runCounter}`;
    };

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: nextRunId,
        now: new Date("2026-03-08T11:10:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "First snapshot",
          report_markdown: "# First",
          rework_target_message: "advisory"
        })
      }
    );

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: nextRunId,
        now: new Date("2026-03-08T11:15:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "inconclusive",
          summary: "Second snapshot",
          report_markdown: "# Second"
        })
      }
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review?.last_autonomous_run_id).toBe("run_meta_04_2");
    expect(loaded.state.meta_review?.last_autonomous_summary).toBe(
      "Second snapshot"
    );

    const reportMarkdown = await readFile(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      "utf8"
    );
    expect(reportMarkdown).toContain("# Second");
    expect(reportMarkdown).not.toContain("# First");
  });

  it("returns CAS conflict error and skips artifact writes when snapshot write fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_05",
      task: "Meta run conflict"
    });

    const before = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          runLiveReview: async () => ({
            recommendation: "approve",
            summary: "No-op",
            report_markdown: "# Report"
          }),
          writeStateSnapshot: async () => {
            throw new StateStoreConflictError("conflict");
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SNAPSHOT_WRITE_CONFLICT"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.fingerprint).toBe(before.fingerprint);

    await expect(
      readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(bubble.paths.metaReviewLastMarkdownArtifactPath, "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("returns success with artifact warning when rolling artifact writes fail", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_06",
      task: "Meta run artifact warning"
    });

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "State is canonical",
          report_markdown: "# Report"
        }),
        writeFile: async () => {
          throw new Error("artifact write blocked");
        }
      }
    );

    expect(result.status).toBe("success");
    expect(result.warnings.map((entry) => entry.reason_code)).toContain(
      "META_REVIEW_ARTIFACT_WRITE_WARNING"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review?.last_autonomous_summary).toBe(
      "State is canonical"
    );
  });

  it("refreshes the effective human approval context after a successful rerun", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_refresh_approval_01",
      task: "Meta rerun approval refresh"
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-03-08T11:31:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 1,
        payload: {
          summary: "META_REVIEW_GATE_RUN_FAILED: stale timeout"
        },
        refs: ["artifacts/meta-review-last.md"]
      }
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "READY_FOR_HUMAN_APPROVAL",
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-03-08T11:31:00.000Z",
        meta_review: {
          ...loaded.state.meta_review!,
          last_autonomous_run_id: "run_meta_stale",
          last_autonomous_status: "error",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "META_REVIEW_GATE_RUN_FAILED: stale timeout",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T11:31:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_refresh_approval_01",
        now: new Date("2026-03-08T11:35:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Recovered approve recommendation",
          report_markdown: "# Recovered"
        })
      }
    );

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: false }
    );
    const inbox = await getBubbleInbox({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });
    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(result.lifecycle_state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(after.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(after.state.meta_review?.last_autonomous_recommendation).toBe("approve");
    expect(after.state.meta_review?.last_autonomous_summary).toBe(
      "Recovered approve recommendation"
    );

    const lastTranscriptMessage = transcript.at(-1);
    expect(lastTranscriptMessage?.type).toBe("APPROVAL_REQUEST");
    expect(lastTranscriptMessage?.payload.summary).toBe(
      "Recovered approve recommendation"
    );
    expect(lastTranscriptMessage?.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "codex",
      latest_recommendation: "approve",
      run_id: "run_meta_refresh_approval_01"
    });

    expect(inbox.pending.approvalRequests).toBe(1);
    expect(inbox.items).toHaveLength(1);
    expect(inbox.items[0]?.summary).toBe("Recovered approve recommendation");

    expect(status.pendingInboxItems.approvalRequests).toBe(1);
    expect(status.pendingInboxItems.total).toBe(1);
    expect(status.transcript.lastMessageType).toBe("APPROVAL_REQUEST");
    expect(status.metaReview.latestRecommendation).toBe("approve");
    expect(status.metaReview.latestSummary).toBe(
      "Recovered approve recommendation"
    );
  });
});

describe("meta-review runner parsing", () => {
  it("extracts the latest delimited marker block from pane capture output", () => {
    const begin = "PAIRFLOW_META_REVIEW_JSON_BEGIN:run_123";
    const end = "PAIRFLOW_META_REVIEW_JSON_END:run_123";
    const text = [
      "noise",
      begin,
      "{\"recommendation\":\"inconclusive\"}",
      end,
      "more noise",
      begin,
      "{\"recommendation\":\"approve\"}",
      end
    ].join("\n");

    const payload = extractMetaReviewDelimitedBlock({
      text,
      beginMarker: begin,
      endMarker: end
    });

    expect(payload).toBe("{\"recommendation\":\"approve\"}");
  });

  it("parses pane JSON output even when string fields contain raw line breaks", () => {
    const raw = `{"recommendation":"approve","summary":"line one
line two","rework_target_message":null,"report_markdown":"# Report

ok"}`;

    const parsed = parseMetaReviewRunnerOutput(raw);

    expect(parsed.recommendation).toBe("approve");
    expect(parsed.summary).toBe("line one\nline two");
    expect(parsed.reportMarkdown).toContain("# Report");
    expect(parsed.reworkTargetMessage).toBeNull();
  });
});

describe("meta-review reads", () => {
  it("status is read-only and returns canonical snapshot fields", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_01",
      task: "Meta status"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_01",
        now: new Date("2026-03-08T11:20:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Looks clean",
          report_markdown: "# Clean"
        })
      }
    );

    const before = await readStateSnapshot(bubble.paths.statePath);
    const status = await getMetaReviewStatus({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(before.fingerprint).toBe(after.fingerprint);
    expect(status.has_run).toBe(true);
    expect(status.last_autonomous_run_id).toBe("run_meta_read_01");
    expect(status.last_autonomous_recommendation).toBe("approve");
  });

  it("last-report is read-only and does not trigger live run", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_02",
      task: "Meta last report"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_02",
        now: new Date("2026-03-08T11:25:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Report exists",
          report_markdown: "# Existing report"
        })
      }
    );

    const before = await readStateSnapshot(bubble.paths.statePath);
    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(before.fingerprint).toBe(after.fingerprint);
    expect(lastReport.has_report).toBe(true);
    expect(lastReport.report_markdown).toContain("Existing report");
  });

  it("returns no-report response before first run", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_03",
      task: "Meta no report"
    });

    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    expect(lastReport.has_report).toBe(false);
    expect(lastReport.report_ref).toBeNull();
  });

  it("handles legacy states without meta_review subtree", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_04",
      task: "Meta legacy"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const legacyState = { ...loaded.state };
    delete legacyState.meta_review;
    await writeStateSnapshot(bubble.paths.statePath, legacyState, {
      expectedFingerprint: loaded.fingerprint
    });

    const before = await readStateSnapshot(bubble.paths.statePath);
    const status = await getMetaReviewStatus({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(before.fingerprint).toBe(after.fingerprint);
    expect(status.has_run).toBe(false);
    expect(status.auto_rework_count).toBe(0);
    expect(status.auto_rework_limit).toBe(5);
    expect(status.sticky_human_gate).toBe(false);
    expect(lastReport.has_report).toBe(false);
  });

  it("returns no-report success when state has report_ref but artifact is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_05",
      task: "Meta missing report"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_05",
        now: new Date("2026-03-08T11:30:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Generated then removed",
          report_markdown: "# Report"
        })
      }
    );

    await unlink(bubble.paths.metaReviewLastMarkdownArtifactPath);

    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    expect(lastReport.has_report).toBe(false);
    expect(lastReport.report_ref).toBe("artifacts/meta-review-last.md");
    expect(lastReport.summary).toBe("Generated then removed");
    expect(lastReport.updated_at).toBe("2026-03-08T11:30:00.000Z");
  });

  it("rejects tampered report_ref values before attempting file reads", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_05b",
      task: "Meta tampered report ref"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_05b",
        now: new Date("2026-03-08T11:35:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Canonical report exists",
          report_markdown: "# Report"
        })
      }
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected canonical meta-review snapshot.");
    }

    const tamperedState: LoadedStateSnapshot = {
      fingerprint: loaded.fingerprint,
      state: {
        ...loaded.state,
        meta_review: {
          ...loaded.state.meta_review,
          last_autonomous_report_ref: "../outside.md"
        }
      }
    };

    let readAttempts = 0;
    const forbiddenReadFile = (async () => {
      readAttempts += 1;
      throw new Error("unexpected read");
    }) as typeof readFile;
    await expect(
      getMetaReviewLastReport(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          readStateSnapshot: async () => tamperedState,
          readFile: forbiddenReadFile
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
    expect(readAttempts).toBe(0);
  });

  it("rejects report_ref values with null-byte before attempting file reads", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_05c",
      task: "Meta null-byte report ref"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_05c",
        now: new Date("2026-03-08T11:36:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Canonical report exists",
          report_markdown: "# Report"
        })
      }
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected canonical meta-review snapshot.");
    }

    const tamperedState: LoadedStateSnapshot = {
      fingerprint: loaded.fingerprint,
      state: {
        ...loaded.state,
        meta_review: {
          ...loaded.state.meta_review,
          last_autonomous_report_ref: "artifacts/meta-review-last.md\u0000tmp"
        }
      }
    };

    let readAttempts = 0;
    const forbiddenReadFile = (async () => {
      readAttempts += 1;
      throw new Error("unexpected read");
    }) as typeof readFile;

    await expect(
      getMetaReviewLastReport(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          readStateSnapshot: async () => tamperedState,
          readFile: forbiddenReadFile
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
    expect(readAttempts).toBe(0);
  });

  it("does not mutate lifecycle state during run", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_06",
      task: "Meta lifecycle immutability"
    });

    const before = await readStateSnapshot(bubble.paths.statePath);
    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "No lifecycle mutation",
          report_markdown: "# Report"
        })
      }
    );
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(before.state.state).toBe("RUNNING");
    expect(result.lifecycle_state).toBe("RUNNING");
    expect(after.state.state).toBe("RUNNING");
  });

  it("wraps invalid run payloads with MetaReviewError", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_07",
      task: "Meta error typing"
    });

    await expect(
      runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          runLiveReview: async () => ({
            recommendation: "rework",
            report_markdown: "# Report"
          })
        }
      )
    ).rejects.toBeInstanceOf(MetaReviewError);
  });
});

describe("meta-review error mapping", () => {
  it("maps schema validation errors to META_REVIEW_SCHEMA_INVALID", () => {
    const mapped = toMetaReviewError(
      new SchemaValidationError("Invalid snapshot", [
        {
          path: "meta_review",
          message: "Must be an object"
        }
      ])
    );

    expect(mapped.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
  });

  it("maps io-style errors to META_REVIEW_IO_ERROR", () => {
    const ioError = Object.assign(new Error("permission denied"), {
      code: "EACCES"
    });
    const mapped = toMetaReviewError(ioError);

    expect(mapped.reasonCode).toBe("META_REVIEW_IO_ERROR");
    expect(mapped.message).toContain("EACCES");
  });

  it("maps generic errors to META_REVIEW_UNKNOWN_ERROR", () => {
    const mapped = toMetaReviewError(new Error("unexpected failure"));
    expect(mapped.reasonCode).toBe("META_REVIEW_UNKNOWN_ERROR");
  });
});
