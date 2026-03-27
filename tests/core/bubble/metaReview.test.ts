import { mkdtemp, readFile, rm, unlink, writeFile as writeFileFs } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getBubbleInbox } from "../../../src/core/bubble/inboxBubble.js";
import { getBubblePaths } from "../../../src/core/bubble/paths.js";
import { getBubbleStatus } from "../../../src/core/bubble/statusBubble.js";
import {
  extractMetaReviewDelimitedBlock,
  hasCanonicalSubmitForActiveMetaReviewRound,
  MetaReviewError,
  getMetaReviewLastReport,
  getMetaReviewStatus,
  parseMetaReviewRunnerOutput,
  runMetaReview,
  submitMetaReviewResult,
  toMetaReviewError
} from "../../../src/core/bubble/metaReview.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
import { MetaReviewGateError } from "../../../src/core/bubble/metaReviewGate.js";
import {
  type LoadedStateSnapshot,
  StateStoreConflictError,
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import { SchemaValidationError } from "../../../src/core/validation.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
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
    ) as {
      recommendation: string;
      report_ref: string;
      report_json?: {
        findings_claim_state?: string;
        findings_claim_source?: string;
      };
    };
    const reportMarkdown = await readFile(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      "utf8"
    );

    expect(reportJson.recommendation).toBe("rework");
    expect(reportJson.report_ref).toBe("artifacts/meta-review-last.md");
    expect(reportJson.report_json).toMatchObject({
      findings_claim_state: "open_findings",
      findings_claim_source: "meta_review_artifact"
    });
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
          report_markdown: "# Recovered",
          report_json: {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 2,
            findings_claimed_open_total: 2,
            findings_artifact_open_total: 2,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 2,
            findings_artifact_status: "available",
            findings_digest_sha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            meta_review_run_id: "run_meta_refresh_approval_01",
            findings_parity_status: "ok",
            findings: [
              {
                severity: "P2",
                title: "refresh advisory a",
                refs: ["artifact://refresh/a"]
              },
              {
                severity: "P3",
                title: "refresh advisory b"
              }
            ]
          }
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
      [deliveryTargetRoleMetadataKey]: "status",
      actor: "meta-reviewer",
      actor_agent: "codex",
      latest_recommendation: "approve",
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });
    expect(lastTranscriptMessage?.payload.metadata).not.toHaveProperty("run_id");
    expect(lastTranscriptMessage?.payload.findings).toEqual([
      {
        priority: "P2",
        severity: "P2",
        title: "refresh advisory a",
        refs: ["artifact://refresh/a"]
      },
      {
        priority: "P3",
        severity: "P3",
        title: "refresh advisory b"
      }
    ]);

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

  it("avoids stale snapshot drift when deep approve refresh omits report_json split metadata", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_refresh_approval_deep_no_split_01",
      task: "Meta deep rerun refresh without explicit split metadata"
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-03-08T11:59:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 1,
        payload: {
          summary: "Meta-review R11: advisory findings remain open.",
          metadata: {
            meta_review_gate_route: "human_gate_sticky_bypass",
            findings_claimed_open_total: 2,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 2
          }
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
        last_command_at: "2026-03-08T11:59:00.000Z",
        meta_review: {
          ...loaded.state.meta_review!,
          last_autonomous_run_id: "run_meta_r10_stale_snapshot",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary:
            "Meta-review R10: approve javasolt, 4 advisory finding nyitott.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T11:50:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const refreshedSummary = "Meta-review R12 deep run: approve, no open findings.";
    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        depth: "deep"
      },
      {
        randomUUID: () => "run_meta_refresh_approval_deep_no_split_01",
        now: new Date("2026-03-08T12:00:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: refreshedSummary,
          report_markdown: "# Deep rerun\n\nApprove."
        })
      }
    );

    expect(result.status).toBe("success");
    expect(result.lifecycle_state).toBe("READY_FOR_HUMAN_APPROVAL");

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.meta_review?.last_autonomous_summary).toBe(refreshedSummary);
    expect(after.state.meta_review?.last_autonomous_summary).not.toContain("R10");

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: false }
    );
    const lastTranscriptMessage = transcript.at(-1);
    expect(lastTranscriptMessage?.type).toBe("APPROVAL_REQUEST");
    expect(lastTranscriptMessage?.payload.summary).toBe(refreshedSummary);
    expect(lastTranscriptMessage?.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_approve",
      findings_claimed_open_total: 0,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 0
    });
    expect(lastTranscriptMessage?.payload.metadata?.approval_summary_normalized).toBeUndefined();

    const status = await getBubbleStatus({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });
    expect(status.metaReview.latestSummary).toBe(refreshedSummary);
  });

  it("fails closed on deep approve refresh when open findings split metadata is omitted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_refresh_approval_missing_split_open_01",
      task: "Meta deep rerun approve/open findings without split metadata"
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
        last_command_at: "2026-03-08T12:04:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const beforeRun = await readStateSnapshot(bubble.paths.statePath);

    let thrown: unknown;
    try {
      await runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          depth: "deep"
        },
        {
          randomUUID: () => "run_meta_refresh_approval_missing_split_open_01",
          now: new Date("2026-03-08T12:05:00.000Z"),
          runLiveReview: async () => ({
            recommendation: "approve",
            summary: "2 advisory findings remain open.",
            report_markdown: "# Deep rerun\n\nAdvisory findings remain open.",
            report_json: {
              findings_claim_state: "open_findings",
              findings_claim_source: "meta_review_artifact",
              findings_count: 2,
              findings_claimed_open_total: 2
            }
          })
        }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_RUN_FAILED"
    });
    expect(String((thrown as Error).message)).toContain(
      "CONVERGED_ADVISORY_METADATA_REQUIRED"
    );

    const afterFailedRun = await readStateSnapshot(bubble.paths.statePath);
    expect(afterFailedRun.state).toEqual(beforeRun.state);
  });

  it("uses shared approval-request normalization metadata on refresh path", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_refresh_approval_normalization_01",
      task: "Meta rerun approval refresh normalization"
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
        last_command_at: "2026-03-08T11:50:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_refresh_approval_normalization_01",
        now: new Date("2026-03-08T11:55:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "inconclusive",
          summary: "1 findings remain unresolved.",
          report_markdown: "# Inconclusive"
        })
      }
    );

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: false }
    );
    const last = transcript.at(-1);
    expect(last?.type).toBe("APPROVAL_REQUEST");
    expect(last?.payload.summary).toBe("1 findings remain unresolved.");
    expect(last?.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      actor: "meta-reviewer",
      actor_agent: "codex",
      latest_recommendation: "inconclusive",
      meta_review_gate_route: "human_gate_inconclusive"
    });
    expect(last?.payload.metadata?.approval_summary_normalized).toBeUndefined();
  });

  it("rolls back state when approval refresh append fails after run writes", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_refresh_approval_append_fail_01",
      task: "Meta rerun approval refresh rollback"
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
        last_command_at: "2026-03-08T11:41:00.000Z",
        meta_review: {
          ...loaded.state.meta_review!,
          last_autonomous_run_id: "run_meta_pre_refresh_append_fail_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Pre-refresh state",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T11:41:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const beforeRun = await readStateSnapshot(bubble.paths.statePath);
    const previousJsonArtifact = JSON.stringify(
      {
        bubble_id: bubble.bubbleId,
        run_id: "run_meta_pre_refresh_append_fail_01",
        round: beforeRun.state.round,
        generated_at: "2026-03-08T11:41:00.000Z",
        status: "success",
        recommendation: "approve",
        summary: "Pre-refresh state",
        report_ref: "artifacts/meta-review-last.md",
        report_json_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0
        }
      },
      null,
      2
    );
    const previousMarkdownArtifact = "# Previous report\n\nPre-refresh state.\n";
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${previousJsonArtifact}\n`,
      "utf8"
    );
    await writeFileFs(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      previousMarkdownArtifact,
      "utf8"
    );

    let thrown: unknown;
    try {
      await runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          randomUUID: () => "run_meta_refresh_append_fail_01",
          now: new Date("2026-03-08T11:42:00.000Z"),
          runLiveReview: async () => ({
            recommendation: "approve",
            summary: "Recovered approve recommendation with append failure.",
            report_markdown: "# Recovered"
          }),
          appendProtocolEnvelope: async () => {
            throw new Error("simulated approval refresh append failure");
          }
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_RUN_FAILED"
    });
    expect(String((thrown as Error).message)).toContain(
      "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_APPLIED"
    );

    const afterFailedRun = await readStateSnapshot(bubble.paths.statePath);
    expect(afterFailedRun.state).toEqual(beforeRun.state);
    await expect(
      readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ).resolves.toBe(`${previousJsonArtifact}\n`);
    await expect(
      readFile(bubble.paths.metaReviewLastMarkdownArtifactPath, "utf8")
    ).resolves.toBe(previousMarkdownArtifact);

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: true }
    );
    expect(
      transcript.some((entry) => entry.type === "APPROVAL_REQUEST")
    ).toBe(false);
  });

  it("emits explicit hard-failure reason when approval refresh append rollback cannot be applied", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_refresh_approval_append_rollback_fail_01",
      task: "Meta rerun approval refresh rollback failure"
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
        last_command_at: "2026-03-08T11:46:00.000Z",
        meta_review: {
          ...loaded.state.meta_review!,
          last_autonomous_run_id: "run_meta_pre_refresh_append_fail_rollback_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Pre-refresh rollback-failure state",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T11:46:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    let writeCallCount = 0;
    const writeStateWithRollbackConflict: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      writeCallCount += 1;
      if (writeCallCount === 2) {
        throw new StateStoreConflictError("simulated refresh rollback conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    let thrown: unknown;
    try {
      await runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          randomUUID: () => "run_meta_refresh_append_fail_rollback_01",
          now: new Date("2026-03-08T11:47:00.000Z"),
          runLiveReview: async () => ({
            recommendation: "approve",
            summary: "Recovered approve recommendation with rollback failure.",
            report_markdown: "# Recovered"
          }),
          appendProtocolEnvelope: async () => {
            throw new Error("simulated approval refresh append failure");
          },
          writeStateSnapshot: writeStateWithRollbackConflict
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_RUN_FAILED"
    });
    expect(String((thrown as Error).message)).toContain(
      "META_REVIEW_GATE_REFRESH_APPROVAL_ROLLBACK_STATE_CONFLICT"
    );
    expect(writeCallCount).toBe(2);

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: true }
    );
    expect(
      transcript.some((entry) => entry.type === "APPROVAL_REQUEST")
    ).toBe(false);
  });

  it("rejects legacy run invocation while META_REVIEW_RUNNING submit channel is active", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_run_guard_01",
      task: "Legacy run guard"
    });

    const before = await readStateSnapshot(bubble.paths.statePath);
    const readyForApproval = applyStateTransition(before.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-03-08T12:10:00.000Z"
    });
    const metaReviewRunning = applyStateTransition(readyForApproval, {
      to: "META_REVIEW_RUNNING",
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      activeSince: "2026-03-08T12:10:30.000Z",
      lastCommandAt: "2026-03-08T12:10:30.000Z"
    });
    await writeStateSnapshot(bubble.paths.statePath, metaReviewRunning, {
      expectedFingerprint: before.fingerprint,
      expectedState: "RUNNING"
    });

    await expect(
      runMetaReview(
        {
          bubbleId: bubble.bubbleId,
          repoPath
        },
        {
          runLiveReview: async () => ({
            recommendation: "approve",
            summary: "Should not run",
            report_markdown: "# Report"
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });
  });
});

describe("meta-review submit", () => {
  async function writeMetaReviewRunningState(input: {
    statePath: string;
    activeAgent: "codex" | "claude";
    activeRole: "meta_reviewer";
    round?: number;
    nowIso: string;
  }): Promise<void> {
    const loaded = await readStateSnapshot(input.statePath);
    await writeStateSnapshot(
      input.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        round: input.round ?? loaded.state.round,
        active_agent: input.activeAgent,
        active_role: input.activeRole,
        active_since: input.nowIso,
        last_command_at: input.nowIso
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  }

  function buildActiveMetaReviewerSession(input: {
    bubbleId: string;
    repoPath: string;
    worktreePath: string;
  }) {
    return {
      [input.bubbleId]: {
        bubbleId: input.bubbleId,
        repoPath: input.repoPath,
        worktreePath: input.worktreePath,
        tmuxSessionName: "pf_meta_submit_test",
        updatedAt: "2026-03-09T09:00:00.000Z",
        metaReviewerPane: {
          role: "meta-reviewer" as const,
          paneIndex: 3,
          active: true,
          updatedAt: "2026-03-09T09:00:00.000Z"
        }
      }
    };
  }

  function buildStructuredSubmitReportJson(input?: {
    findingsClaimState?: "clean" | "open_findings" | "unknown";
    findingsClaimSource?:
      | "meta_review_artifact"
      | "legacy_summary_parser";
    findingsCount?: unknown;
    metaReviewRunId?: string;
    findingsRunId?: string;
    findingsArtifactRef?: string;
  }): Record<string, unknown> {
    const findingsClaimState = input?.findingsClaimState ?? "clean";
    const reportJson: Record<string, unknown> = {
      findings_claim_state: findingsClaimState,
      findings_claim_source: input?.findingsClaimSource ?? "meta_review_artifact",
      findings_count:
        input?.findingsCount ??
        (findingsClaimState === "open_findings" ? 1 : 0)
    };
    if (input?.metaReviewRunId !== undefined) {
      reportJson.meta_review_run_id = input.metaReviewRunId;
    }
    if (input?.findingsRunId !== undefined) {
      reportJson.findings_run_id = input.findingsRunId;
    }
    if (input?.findingsArtifactRef !== undefined) {
      reportJson.findings_artifact_ref = input.findingsArtifactRef;
    }
    return reportJson;
  }

  it("requires report_ref for canonical submit detection in active meta-review window", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_helper_01",
      task: "Meta submit canonical helper report_ref requirement"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:05:00.000Z"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);

    expect(
      hasCanonicalSubmitForActiveMetaReviewRound({
        state: loaded.state,
        snapshot: {
          last_autonomous_run_id: null,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Structured submit with missing report_ref.",
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-09T09:06:00.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      })
    ).toBe(false);
  });

  it("does not treat canonical submit as active-window match when active_since is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_helper_02",
      task: "Meta submit canonical helper requires active_since"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:10:00.000Z"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);

    expect(
      hasCanonicalSubmitForActiveMetaReviewRound({
        state: {
          ...loaded.state,
          active_since: null
        },
        snapshot: {
          last_autonomous_run_id: null,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Structured submit snapshot.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-09T09:10:10.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      })
    ).toBe(false);
  });

  it("does not treat canonical submit as active-window match when active_since is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_helper_03",
      task: "Meta submit canonical helper rejects invalid active_since"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:12:00.000Z"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);

    expect(
      hasCanonicalSubmitForActiveMetaReviewRound({
        state: {
          ...loaded.state,
          active_since: "not-a-timestamp"
        },
        snapshot: {
          last_autonomous_run_id: null,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Structured submit snapshot.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-09T09:12:10.000Z",
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      })
    ).toBe(false);
  });

  it("rejects submit when report_json is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_missing_report_json_01",
      task: "Meta submit missing report_json"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Summary only submit should be rejected.",
          report_markdown: "# Meta Review\n\nMissing report_json."
        } as unknown as Parameters<typeof submitMetaReviewResult>[0],
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects submit when summary claims open findings but structured findings_count is 0", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_summary_open_mismatch_01",
      task: "Meta submit open-summary mismatch"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:30.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "1 open finding remains in this run.",
          report_markdown: "# Meta Review\n\nOpen finding summary mismatch.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "clean",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    });
  });

  it("rejects submit when summary claims no findings but structured payload reports open findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_summary_clean_mismatch_01",
      task: "Meta submit no-findings mismatch"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:45.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "No findings remain after this review.",
          report_markdown: "# Meta Review\n\nNo-findings mismatch.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 2
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    });
  });

  it("rejects submit when claim state is unknown with zero findings_count and summary claims open findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_unknown_zero_summary_open_01",
      task: "Meta submit unknown state zero count open summary mismatch"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:47.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "1 open finding remains in this run.",
          report_markdown: "# Meta Review\n\nUnknown state with zero count open-summary mismatch.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "unknown",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    });
  });

  it("rejects submit when claim state is unknown with positive findings_count and summary claims no findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_unknown_positive_summary_clean_01",
      task: "Meta submit unknown state positive count no-findings summary mismatch"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:47.500Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "No findings remain after this review.",
          report_markdown: "# Meta Review\n\nUnknown state with positive count no-findings mismatch.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "unknown",
            findingsCount: 2
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    });
  });

  it("accepts submit when claim state is unknown with zero findings_count and summary is ambiguous", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_unknown_zero_ambiguous_accept_01",
      task: "Meta submit unknown state zero count ambiguous summary acceptance"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:48.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Operator notes captured for follow-up context.",
          report_markdown: "# Meta Review\n\nUnknown state with zero count and ambiguous summary.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "unknown",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve"
    });
  });

  it("accepts submit when summary claims open findings and structured payload reports open findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_summary_open_aligned_01",
      task: "Meta submit open-summary aligned"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:50.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "rework",
          summary: "1 open finding remains in this run.",
          report_markdown: "# Meta Review\n\nOpen findings remain and rework is required.",
          rework_target_message: "Resolve the remaining open finding.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 1,
            metaReviewRunId: "run_meta_submit_summary_open_aligned_01"
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "rework"
    });
  });

  it("accepts submit when summary is ambiguous and structured payload is clean", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_summary_ambiguous_clean_01",
      task: "Meta submit ambiguous summary should pass"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:55.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Follow-up notes captured for operator context.",
          report_markdown: "# Meta Review\n\nAmbiguous summary with clean structured payload.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "clean",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve"
    });
  });

  it("accepts submit on canonical clean/no-findings path with explicit no-findings summary assertion", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_clean_zero_no_findings_accept_01",
      task: "Meta submit canonical clean no-findings acceptance"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:56.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "No findings remain after this review.",
          report_markdown: "# Meta Review\n\nCanonical clean no-findings path.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "clean",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve"
    });
  });

  it("accepts submit when summary is ambiguous and structured payload reports open findings (policy: structured source-of-truth)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_summary_ambiguous_open_01",
      task: "Meta submit ambiguous summary with open findings payload"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:56.500Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "rework",
          summary: "Operator context notes captured for follow-up handling.",
          report_markdown: "# Meta Review\n\nAmbiguous summary with structured open findings payload.",
          rework_target_message: "Resolve remaining open findings.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 2,
            metaReviewRunId: "run_meta_submit_summary_ambiguous_open_01"
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "rework"
    });
  });

  it("rejects submit when structured tuple has open_findings state with zero findings_count", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_tuple_open_zero_01",
      task: "Meta submit tuple consistency open-zero"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:57.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Operator notes captured for context.",
          report_markdown: "# Meta Review\n\nTuple inconsistency open/zero.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects submit when structured tuple has clean state with positive findings_count", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_tuple_clean_positive_01",
      task: "Meta submit tuple consistency clean-positive"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:57.500Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Operator notes captured for context.",
          report_markdown: "# Meta Review\n\nTuple inconsistency clean/positive.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "clean",
            findingsCount: 1
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects submit when report_json claim tuple is incomplete in either direction", async () => {
    const repoPath = await createTempRepo();
    const invalidCases: Array<{
      bubbleId: string;
      reportJson: Record<string, unknown>;
    }> = [
      {
        bubbleId: "b_meta_submit_claim_tuple_missing_source_01",
        reportJson: {
          findings_claim_state: "clean",
          findings_count: 0
        }
      },
      {
        bubbleId: "b_meta_submit_claim_tuple_missing_state_01",
        reportJson: {
          findings_claim_source: "meta_review_artifact",
          findings_count: 0
        }
      }
    ];

    for (const testCase of invalidCases) {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: testCase.bubbleId,
        task: "Meta submit incomplete claim tuple"
      });
      await writeMetaReviewRunningState({
        statePath: bubble.paths.statePath,
        activeAgent: "codex",
        activeRole: "meta_reviewer",
        nowIso: "2026-03-09T09:09:58.000Z"
      });

      await expect(
        submitMetaReviewResult(
          {
            bubbleId: bubble.bubbleId,
            repoPath,
            round: 1,
            recommendation: "approve",
            summary: "Claim tuple incomplete should reject.",
            report_markdown: "# Meta Review\n\nIncomplete claim tuple.",
            report_json: testCase.reportJson
          },
          {
            readRuntimeSessionsRegistry: async () =>
              buildActiveMetaReviewerSession({
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath
              })
          }
        )
      ).rejects.toMatchObject({
        reasonCode: "META_REVIEW_SCHEMA_INVALID"
      });
    }
  });

  it("rejects submit when report_json claim source is not meta_review_artifact", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_claim_source_invalid_01",
      task: "Meta submit invalid claim source"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:09:59.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Claim source mismatch should reject.",
          report_markdown: "# Meta Review\n\nInvalid claim source.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "clean",
            findingsClaimSource: "legacy_summary_parser",
            findingsCount: 0
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects submit when findings_count is missing or invalid even if findings fallback is present", async () => {
    const repoPath = await createTempRepo();
    const invalidCases: Array<{
      bubbleId: string;
      reportJson: Record<string, unknown>;
    }> = [
      {
        bubbleId: "b_meta_submit_findings_count_missing_01",
        reportJson: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact"
        }
      },
      {
        bubbleId: "b_meta_submit_findings_count_invalid_neg_01",
        reportJson: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: -1,
          findings: [{ id: "fallback_1" }]
        }
      },
      {
        bubbleId: "b_meta_submit_findings_count_invalid_float_01",
        reportJson: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1.5
        }
      },
      {
        bubbleId: "b_meta_submit_findings_count_invalid_string_01",
        reportJson: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: "1",
          findings: 1
        }
      },
      {
        bubbleId: "b_meta_submit_findings_count_missing_with_findings_array_01",
        reportJson: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings: [{ id: "fallback_2" }, { id: "fallback_3" }]
        }
      }
    ];

    for (const invalidCase of invalidCases) {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: invalidCase.bubbleId,
        task: "Meta submit findings_count validation"
      });
      await writeMetaReviewRunningState({
        statePath: bubble.paths.statePath,
        activeAgent: "codex",
        activeRole: "meta_reviewer",
        nowIso: "2026-03-09T09:10:00.000Z"
      });

      await expect(
        submitMetaReviewResult(
          {
            bubbleId: bubble.bubbleId,
            repoPath,
            round: 1,
            recommendation: "approve",
            summary: "Invalid findings_count should reject.",
            report_markdown: "# Meta Review\n\nInvalid findings_count.",
            report_json: invalidCase.reportJson
          },
          {
            readRuntimeSessionsRegistry: async () =>
              buildActiveMetaReviewerSession({
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath
              })
          }
        )
      ).rejects.toMatchObject({
        reasonCode: "META_REVIEW_SCHEMA_INVALID"
      });
    }
  });

  it("rejects submit when both claim fields are missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_claim_fields_missing_01",
      task: "Meta submit missing claim fields"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:10:05.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Missing claim tuple should reject.",
          report_markdown: "# Meta Review\n\nMissing claim fields.",
          report_json: {
            findings_count: 0
          }
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects direct submit API payload when report_json is empty object", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_empty_report_json_01",
      task: "Meta submit empty report_json direct api"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:10:06.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Empty report_json should be rejected.",
          report_markdown: "# Meta Review\n\nEmpty report_json payload.",
          report_json: {}
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("accepts structured approve submit and persists canonical snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_01",
      task: "Meta submit approve"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:10:00.000Z"
    });

    const result = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "Looks good after final review.",
        report_markdown: "# Meta Review\n\nApproved.",
        report_json: buildStructuredSubmitReportJson()
      },
      {
        randomUUID: () => "run_meta_submit_01",
        now: new Date("2026-03-09T09:11:00.000Z"),
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    expect(result.status).toBe("success");
    expect(result.recommendation).toBe("approve");
    expect(result.run_id).toBe("run_meta_submit_01");
    expect(result.lifecycle_state).toBe("META_REVIEW_RUNNING");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review).toMatchObject({
      last_autonomous_run_id: "run_meta_submit_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "approve",
      last_autonomous_summary: "Looks good after final review.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_rework_target_message: null
    });
  });

  it("accepts advisory-only approve submit and preserves split metadata when artifact open total is absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_approve_advisory_01",
      task: "Meta submit advisory-only approve"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:11:30.000Z"
    });

    const result = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "2 advisory findings remain open.",
        report_markdown: "# Meta Review\n\nAdvisory-only approve.",
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2
        }
      },
      {
        randomUUID: () => "run_meta_submit_approve_advisory_01",
        now: new Date("2026-03-09T09:12:00.000Z"),
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    expect(result.status).toBe("success");
    expect(result.recommendation).toBe("approve");
    expect(result.run_id).toBe("run_meta_submit_approve_advisory_01");
    expect(result.report_json).toMatchObject({
      findings_claim_state: "open_findings",
      findings_count: 2,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: null,
      findings_parity_status: null
    });

    const reportJsonArtifact = JSON.parse(
      await readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ) as {
      report_json?: Record<string, unknown>;
    };
    expect(reportJsonArtifact.report_json).toMatchObject({
      findings_claim_state: "open_findings",
      findings_count: 2,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: null,
      findings_parity_status: null
    });
  });

  it("accepts advisory-only approve submit when summary only asserts no P0/P1 findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_approve_no_blocking_summary_01",
      task: "Meta submit advisory-only approve with scoped no-blocking summary"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:12:30.000Z"
    });

    const summary = "No open P0/P1 findings remain.";
    const result = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary,
        report_markdown: "# Meta Review\n\nAdvisory-only approve.",
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2
        }
      },
      {
        randomUUID: () => "run_meta_submit_approve_no_blocking_summary_01",
        now: new Date("2026-03-09T09:13:00.000Z"),
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    expect(result.status).toBe("success");
    expect(result.recommendation).toBe("approve");
    expect(result.summary).toBe(summary);
    expect(result.report_json).toMatchObject({
      findings_claim_state: "open_findings",
      findings_count: 2,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.meta_review?.last_autonomous_summary).toBe(summary);
  });

  it("accepts structured rework submit when explicit same-run run-link is valid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_02",
      task: "Meta submit rework"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:20:00.000Z"
    });

    const result = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "rework",
        summary: "Needs one more deterministic fix.",
        report_markdown: "# Meta Review\n\nRework required.",
        rework_target_message: "Fix retry sequencing in gate recovery.",
        report_json: buildStructuredSubmitReportJson({
          findingsClaimState: "open_findings",
          findingsCount: 1,
          metaReviewRunId: "run_meta_submit_02"
        })
      },
      {
        randomUUID: () => "run_generated_submit_02",
        now: new Date("2026-03-09T09:21:00.000Z"),
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    expect(result.status).toBe("success");
    expect(result.recommendation).toBe("rework");
    expect(result.run_id).toBe("run_meta_submit_02");
    expect(result.rework_target_message).toBe(
      "Fix retry sequencing in gate recovery."
    );
    const reportJson = JSON.parse(
      await readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ) as {
      run_id?: string;
      report_json?: {
        findings_count?: number;
        findings_claim_state?: string;
        meta_review_run_id?: string;
        findings_artifact_ref?: string;
      };
    };
    expect(reportJson.run_id).toBe("run_meta_submit_02");
    expect(reportJson.report_json?.findings_claim_state).toBe("open_findings");
    expect(reportJson.report_json?.findings_count).toBe(1);
    expect(reportJson.report_json?.meta_review_run_id).toBe(
      "run_meta_submit_02"
    );
    expect(reportJson.report_json?.findings_artifact_ref).toBe(
      "artifacts/meta-review-last.json"
    );
  });

  it("normalizes markdown findings_artifact_ref to json artifact for rework submit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_03",
      task: "Meta submit rework findings artifact normalization"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:22:00.000Z"
    });

    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "rework",
        summary: "Needs another pass.",
        report_markdown: "# Meta Review\n\nRework required.",
        rework_target_message: "Fix parity artifact path.",
        report_json: buildStructuredSubmitReportJson({
          findingsClaimState: "open_findings",
          findingsCount: 1,
          metaReviewRunId: "run_meta_submit_03",
          findingsArtifactRef: "artifacts/meta-review-last.md"
        })
      },
      {
        randomUUID: () => "run_generated_submit_03",
        now: new Date("2026-03-09T09:22:30.000Z"),
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    const reportJson = JSON.parse(
      await readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ) as {
      report_json?: {
        findings_artifact_ref?: string;
      };
    };
    expect(reportJson.report_json?.findings_artifact_ref).toBe(
      "artifacts/meta-review-last.json"
    );
  });

  it("rejects rework submit when report_json run-link metadata is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_rework_run_link_missing_01",
      task: "Meta submit rework missing run-link metadata"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:24:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "rework",
          summary: "Missing run-link metadata.",
          report_markdown: "# Meta Review\n\nMissing run-link metadata.",
          rework_target_message: "Fix run-link metadata.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 1
          })
        },
        {
          randomUUID: () => "run_meta_submit_rework_run_link_missing_01",
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects rework submit when report_json run-link fields mismatch each other", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_rework_run_link_mismatch_01",
      task: "Meta submit rework run-link mismatch metadata"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:25:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "rework",
          summary: "Mismatched run-link metadata.",
          report_markdown: "# Meta Review\n\nMismatched run-link metadata.",
          rework_target_message: "Fix run-link metadata.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 1,
            metaReviewRunId: "run_meta_submit_rework_run_link_mismatch_01",
            findingsRunId: "run_meta_submit_rework_run_link_mismatch_other_01"
          })
        },
        {
          randomUUID: () => "run_meta_submit_rework_run_link_mismatch_01",
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("rejects rework submit without rework target message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_03",
      task: "Meta submit missing rework target"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:30:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "rework",
          summary: "Missing target.",
          report_markdown: "# Meta Review\n\nMissing target.",
          report_json: buildStructuredSubmitReportJson({
            findingsClaimState: "open_findings",
            findingsCount: 1,
            metaReviewRunId: "run_meta_submit_03_missing_target"
          })
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID"
    });
  });

  it("prioritizes rework-target invariant before parity mismatch when recommendation is rework", async () => {
    const repoPath = await createTempRepo();
    const invalidCases: Array<{
      bubbleId: string;
      reworkTargetMessage?: string;
    }> = [
      {
        bubbleId: "b_meta_submit_rework_precedence_missing_target_01"
      },
      {
        bubbleId: "b_meta_submit_rework_precedence_empty_target_01",
        reworkTargetMessage: "   "
      }
    ];

    for (const invalidCase of invalidCases) {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: invalidCase.bubbleId,
        task: "Meta submit rework invariant-first precedence"
      });
      await writeMetaReviewRunningState({
        statePath: bubble.paths.statePath,
        activeAgent: "codex",
        activeRole: "meta_reviewer",
        nowIso: "2026-03-09T09:30:30.000Z"
      });

      await expect(
        submitMetaReviewResult(
          {
            bubbleId: bubble.bubbleId,
            repoPath,
            round: 1,
            recommendation: "rework",
            summary: "No findings remain after this review.",
            report_markdown: "# Meta Review\n\nRework submit missing/empty target with parity mismatch payload.",
            ...(invalidCase.reworkTargetMessage !== undefined
              ? { rework_target_message: invalidCase.reworkTargetMessage }
              : {}),
            report_json: buildStructuredSubmitReportJson({
              findingsClaimState: "open_findings",
              findingsCount: 2,
              metaReviewRunId: `${invalidCase.bubbleId}_run`
            })
          },
          {
            readRuntimeSessionsRegistry: async () =>
              buildActiveMetaReviewerSession({
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath
              })
          }
        )
      ).rejects.toMatchObject({
        reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID"
      });
    }
  });

  it("rejects submit when lifecycle is not META_REVIEW_RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_guard_01",
      task: "Meta submit lifecycle guard"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Lifecycle guard should reject.",
          report_markdown: "# Meta Review\n\nLifecycle guard reject.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          readRuntimeSessionsRegistry: async () => {
            throw new Error("runtime sessions must not be read on lifecycle guard reject");
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });
  });

  it("rejects submit when active role is not meta_reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_guard_02",
      task: "Meta submit active-role guard"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const mockedState = {
      ...loaded.state,
      state: "META_REVIEW_RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "implementer" as const,
      active_since: "2026-03-09T09:35:00.000Z",
      last_command_at: "2026-03-09T09:35:00.000Z"
    };

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Active role guard should reject.",
          report_markdown: "# Meta Review\n\nActive role guard reject.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          readStateSnapshot: async () => ({
            fingerprint: loaded.fingerprint,
            state: mockedState
          }),
          readRuntimeSessionsRegistry: async () => {
            throw new Error("runtime sessions must not be read on role guard reject");
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SENDER_MISMATCH"
    });
  });

  it("rejects submit when active ownership is missing active_since", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_guard_03",
      task: "Meta submit active-ownership guard"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const mockedState = {
      ...loaded.state,
      state: "META_REVIEW_RUNNING" as const,
      active_agent: "codex" as const,
      active_role: "meta_reviewer" as const,
      active_since: null,
      last_command_at: "2026-03-09T09:36:00.000Z"
    };

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Active ownership guard should reject.",
          report_markdown: "# Meta Review\n\nActive ownership guard reject.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          readStateSnapshot: async () => ({
            fingerprint: loaded.fingerprint,
            state: mockedState
          }),
          readRuntimeSessionsRegistry: async () => {
            throw new Error("runtime sessions must not be read on ownership guard reject");
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SENDER_MISMATCH"
    });
  });

  it("rejects submit when runtime session ownership is missing and does not mutate snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_04",
      task: "Meta submit missing runtime ownership"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:40:00.000Z"
    });
    const before = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Should fail sender check.",
          report_markdown: "# Meta Review\n\nShould fail.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          readRuntimeSessionsRegistry: async () => ({})
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SENDER_MISMATCH"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.fingerprint).toBe(before.fingerprint);
  });

  it("rejects submit when runtime pane ownership is not active and does not mutate snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_04b",
      task: "Meta submit inactive pane ownership"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:45:00.000Z"
    });
    const before = await readStateSnapshot(bubble.paths.statePath);

    let rejection: unknown;
    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "Should fail runtime pane ownership check.",
        report_markdown: "# Meta Review\n\nInactive pane should reject.",
        report_json: buildStructuredSubmitReportJson()
      },
      {
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            tmuxSessionName: "pf_meta_submit_test",
            updatedAt: "2026-03-09T09:45:00.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: 3,
              active: false,
              updatedAt: "2026-03-09T09:45:00.000Z"
            }
          }
        })
      }
    ).catch((error: unknown) => {
      rejection = error;
    });
    expect(rejection).toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });
    if (rejection instanceof Error) {
      expect(rejection.message).toContain("submit window closed");
    }

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.fingerprint).toBe(before.fingerprint);
  });

  it("accepts submit when active runtime pane binding has no gate run identity", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_04c",
      task: "Meta submit missing gate run identity"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:47:00.000Z"
    });
    const before = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Should succeed without gate run identity.",
          report_markdown: "# Meta Review\n\nMissing run binding.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          readRuntimeSessionsRegistry: async () => ({
            [bubble.bubbleId]: {
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath,
              tmuxSessionName: "pf_meta_submit_test",
              updatedAt: "2026-03-09T09:47:00.000Z",
              metaReviewerPane: {
                role: "meta-reviewer",
                paneIndex: 3,
                active: true,
                updatedAt: "2026-03-09T09:47:00.000Z"
              }
            }
          })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.fingerprint).not.toBe(before.fingerprint);
  });

  it("rejects duplicate structured submit for the same active gate run identity", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_04d",
      task: "Meta submit duplicate same gate run"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:48:00.000Z"
    });

    const runtimeSessions = {
      [bubble.bubbleId]: {
        bubbleId: bubble.bubbleId,
        repoPath,
        worktreePath: bubble.paths.worktreePath,
        tmuxSessionName: "pf_meta_submit_test",
        updatedAt: "2026-03-09T09:48:00.000Z",
        metaReviewerPane: {
          role: "meta-reviewer" as const,
          paneIndex: 3,
          active: true,
          updatedAt: "2026-03-09T09:48:00.000Z"
        }
      }
    };

    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "First submit should succeed.",
        report_markdown: "# Meta Review\n\nFirst submit.",
        report_json: buildStructuredSubmitReportJson()
      },
      {
        randomUUID: () => "run_meta_submit_04d",
        now: new Date("2026-03-09T09:48:10.000Z"),
        readRuntimeSessionsRegistry: async () => runtimeSessions
      }
    );

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Second submit should be rejected.",
          report_markdown: "# Meta Review\n\nSecond submit.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          now: new Date("2026-03-09T09:48:11.000Z"),
          readRuntimeSessionsRegistry: async () => runtimeSessions
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.meta_review?.last_autonomous_run_id).toBe(
      "run_meta_submit_04d"
    );
    expect(after.state.meta_review?.last_autonomous_summary).toBe(
      "First submit should succeed."
    );
  });

  it("prioritizes schema/parity validation before duplicate-state guard for malformed duplicate submits", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_duplicate_malformed_precedence_01",
      task: "Meta submit duplicate malformed precedence"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:48:20.000Z"
    });

    const runtimeSessions = buildActiveMetaReviewerSession({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath
    });

    await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "First submit should succeed for precedence test.",
        report_markdown: "# Meta Review\n\nFirst submit for precedence test.",
        report_json: buildStructuredSubmitReportJson()
      },
      {
        randomUUID: () => "run_meta_submit_duplicate_malformed_precedence_01",
        now: new Date("2026-03-09T09:48:21.000Z"),
        readRuntimeSessionsRegistry: async () => runtimeSessions
      }
    );

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Second malformed duplicate submit should fail schema-first.",
          report_markdown: "# Meta Review\n\nSecond malformed duplicate submit.",
          report_json: {}
        },
        {
          now: new Date("2026-03-09T09:48:22.000Z"),
          readRuntimeSessionsRegistry: async () => runtimeSessions
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.meta_review?.last_autonomous_run_id).toBe(
      "run_meta_submit_duplicate_malformed_precedence_01"
    );
  });

  it("classifies same-run duplicate on CAS conflict even after lifecycle left META_REVIEW_RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_04e",
      task: "Meta submit duplicate after lifecycle departure"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:49:00.000Z"
    });

    const runId = "run_meta_submit_dup_02";
    const runtimeSessions = {
      [bubble.bubbleId]: {
        bubbleId: bubble.bubbleId,
        repoPath,
        worktreePath: bubble.paths.worktreePath,
        tmuxSessionName: "pf_meta_submit_test",
        updatedAt: "2026-03-09T09:49:00.000Z",
        metaReviewerPane: {
          role: "meta-reviewer" as const,
          paneIndex: 3,
          active: true,
          updatedAt: "2026-03-09T09:49:00.000Z"
        }
      }
    };

    let conflictInjected = false;
    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Duplicate submit should be detected after lifecycle departure.",
          report_markdown: "# Meta Review\n\nDuplicate after lifecycle departure.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          now: new Date("2026-03-09T09:49:10.000Z"),
          readRuntimeSessionsRegistry: async () => runtimeSessions,
          writeStateSnapshot: async (statePath, state, options) => {
            if (!conflictInjected) {
              conflictInjected = true;
              const current = await readStateSnapshot(statePath);
              const readyForHuman = applyStateTransition(current.state, {
                to: "READY_FOR_HUMAN_APPROVAL",
                activeAgent: null,
                activeRole: null,
                activeSince: null,
                lastCommandAt: "2026-03-09T09:49:09.000Z"
              });
              await writeStateSnapshot(
                statePath,
                {
                  ...readyForHuman,
                  meta_review: {
                    ...(current.state.meta_review ?? {
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
                    }),
                    last_autonomous_run_id: runId,
                    last_autonomous_status: "success",
                    last_autonomous_recommendation: "approve",
                    last_autonomous_summary: "Concurrent submit already routed gate.",
                    last_autonomous_report_ref: "artifacts/meta-review-last.md",
                    last_autonomous_rework_target_message: null,
                    last_autonomous_updated_at: "2026-03-09T09:49:09.000Z"
                  }
                },
                {
                  expectedFingerprint: current.fingerprint,
                  expectedState: "META_REVIEW_RUNNING"
                }
              );
              throw new StateStoreConflictError("simulated duplicate race conflict");
            }
            return writeStateSnapshot(statePath, state, options);
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_STATE_INVALID"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(after.state.meta_review?.last_autonomous_run_id).toBe(runId);
    expect(after.state.meta_review?.last_autonomous_summary).toBe(
      "Concurrent submit already routed gate."
    );
  });

  it("rejects stale round submit and does not mutate snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_submit_05",
      task: "Meta submit stale round"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-09T09:50:00.000Z"
    });
    const before = await readStateSnapshot(bubble.paths.statePath);

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 2,
          recommendation: "approve",
          summary: "Stale round should fail.",
          report_markdown: "# Meta Review\n\nStale round.",
          report_json: buildStructuredSubmitReportJson()
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_ROUND_MISMATCH"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.fingerprint).toBe(before.fingerprint);
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

  it("reads blocking/advisory split parity fields from report json into status and last-report views", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_split_01",
      task: "Meta split parity snapshot"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_split_01",
        now: new Date("2026-03-08T11:25:30.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Split parity snapshot exists",
          report_markdown: "# Split report",
          report_json: {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 2,
            findings_claimed_open_total: 2,
            findings_artifact_open_total: 2,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 2,
            findings_artifact_status: "available",
            findings_digest_sha256:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            meta_review_run_id: "run_meta_read_split_01",
            findings_parity_status: "ok"
          }
        })
      }
    );

    const status = await getMetaReviewStatus({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    expect(status).toMatchObject({
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });
    expect(lastReport).toMatchObject({
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });
  });

  it("surfaces deterministic parity diagnostics when parity JSON is malformed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_parity_parse_01",
      task: "Meta parity parse diagnostics"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_parity_parse_01",
        now: new Date("2026-03-08T11:26:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Parity diagnostics parse case",
          report_markdown: "# Existing report"
        })
      }
    );

    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "{malformed-json",
      "utf8"
    );

    const status = await getMetaReviewStatus({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    expect(status.parity_diagnostics).toContain(
      "META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED"
    );
    expect(lastReport.parity_diagnostics).toContain(
      "META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED"
    );
    expect(lastReport.has_report).toBe(true);
    expect(lastReport.report_markdown).toContain("Existing report");
  });

  it("surfaces deterministic parity diagnostics when parity JSON cannot be read", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_parity_read_01",
      task: "Meta parity read diagnostics"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_parity_read_01",
        now: new Date("2026-03-08T11:27:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Parity diagnostics read case",
          report_markdown: "# Existing report"
        })
      }
    );

    const readWithDeniedParityArtifact = (async (
      filePath: string,
      encoding: BufferEncoding
    ) => {
      if (filePath === bubble.paths.metaReviewLastJsonArtifactPath) {
        const error = new Error("permission denied") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
      return readFile(filePath, encoding);
    }) as typeof readFile;

    const status = await getMetaReviewStatus(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        readFile: readWithDeniedParityArtifact
      }
    );
    const lastReport = await getMetaReviewLastReport(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        readFile: readWithDeniedParityArtifact
      }
    );

    expect(status.parity_diagnostics).toContain(
      "META_REVIEW_PARITY_ARTIFACT_READ_FAILED:EACCES"
    );
    expect(lastReport.parity_diagnostics).toContain(
      "META_REVIEW_PARITY_ARTIFACT_READ_FAILED:EACCES"
    );
    expect(lastReport.has_report).toBe(true);
    expect(lastReport.report_markdown).toContain("Existing report");
  });

  it("surfaces deterministic stale snapshot diagnostics when cached report round trails current bubble round", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_snapshot_stale_01",
      task: "Meta stale snapshot diagnostics"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_snapshot_stale_01",
        now: new Date("2026-03-08T11:28:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Stale snapshot diagnostics case",
          report_markdown: "# Existing report"
        })
      }
    );

    const reportPayloadRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const reportPayload = JSON.parse(reportPayloadRaw) as Record<string, unknown>;
    reportPayload.round = 3;
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        round: 11
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const status = await getMetaReviewStatus({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    expect(status.parity_diagnostics).toContain(
      "META_REVIEW_SNAPSHOT_ROUND_STALE:snapshot_round=3;current_round=11"
    );
    expect(status.has_run).toBe(false);
    expect(status.last_autonomous_recommendation).toBeNull();
    expect(status.last_autonomous_report_ref).toBeNull();
    expect(status.sticky_human_gate).toBe(false);
    expect(lastReport.parity_diagnostics).toContain(
      "META_REVIEW_SNAPSHOT_ROUND_STALE:snapshot_round=3;current_round=11"
    );
    expect(lastReport.parity_diagnostics).toEqual([
      "META_REVIEW_SNAPSHOT_ROUND_STALE:snapshot_round=3;current_round=11"
    ]);
    expect(lastReport.has_report).toBe(false);
    expect(lastReport.report_ref).toBeNull();
    expect(lastReport.summary).toBeNull();
    expect(lastReport.updated_at).toBeNull();
  });

  it("fails closed for legacy parity artifacts without a top-level round after round increment", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_snapshot_round_missing_01",
      task: "Meta legacy no-round snapshot"
    });

    await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_read_snapshot_round_missing_01",
        now: new Date("2026-03-08T11:29:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Legacy no-round artifact case",
          report_markdown: "# Existing report"
        })
      }
    );

    const reportPayloadRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const reportPayload = JSON.parse(reportPayloadRaw) as Record<string, unknown>;
    delete reportPayload.round;
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        round: 12
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const status = await getMetaReviewStatus({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const lastReport = await getMetaReviewLastReport({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    expect(status.parity_diagnostics).toEqual([
      "META_REVIEW_SNAPSHOT_ROUND_MISSING:current_round=12"
    ]);
    expect(status.has_run).toBe(false);
    expect(status.last_autonomous_recommendation).toBeNull();
    expect(status.last_autonomous_report_ref).toBeNull();
    expect(status.sticky_human_gate).toBe(false);

    expect(lastReport.parity_diagnostics).toEqual([
      "META_REVIEW_SNAPSHOT_ROUND_MISSING:current_round=12"
    ]);
    expect(lastReport.has_report).toBe(false);
    expect(lastReport.report_ref).toBeNull();
    expect(lastReport.summary).toBeNull();
    expect(lastReport.updated_at).toBeNull();
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

  it("recovers META_REVIEW_FAILED to READY_FOR_HUMAN_APPROVAL on successful rerun", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_read_recover_01",
      task: "Meta failed recovery"
    });

    const before = await readStateSnapshot(bubble.paths.statePath);
    const failed = applyStateTransition(before.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-03-08T12:40:00.000Z"
    });
    const failedAfterMeta = applyStateTransition(failed, {
      to: "META_REVIEW_RUNNING",
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      activeSince: "2026-03-08T12:41:00.000Z",
      lastCommandAt: "2026-03-08T12:41:00.000Z"
    });
    const failedState = applyStateTransition(failedAfterMeta, {
      to: "META_REVIEW_FAILED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-03-08T12:42:00.000Z"
    });
    await writeStateSnapshot(bubble.paths.statePath, failedState, {
      expectedFingerprint: before.fingerprint,
      expectedState: "RUNNING"
    });

    const result = await runMetaReview(
      {
        bubbleId: bubble.bubbleId,
        repoPath
      },
      {
        randomUUID: () => "run_meta_recover_01",
        now: new Date("2026-03-08T12:43:00.000Z"),
        runLiveReview: async () => ({
          recommendation: "approve",
          summary: "Recovered after manual rerun",
          report_markdown: "# Recovered",
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0,
            findings_claimed_open_total: 0,
            findings_blocking_open_total: 0,
            findings_advisory_open_total: 0
          }
        })
      }
    );
    const after = await readStateSnapshot(bubble.paths.statePath);

    expect(result.status).toBe("success");
    expect(result.lifecycle_state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(after.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(after.state.meta_review?.sticky_human_gate).toBe(true);
    expect(after.state.meta_review?.last_autonomous_recommendation).toBe("approve");
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

  it("maps MetaReviewGateError while preserving gate reason code in message", () => {
    const mapped = toMetaReviewError(
      new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "gate transition mismatch"
      )
    );

    expect(mapped.reasonCode).toBe("META_REVIEW_GATE_RUN_FAILED");
    expect(mapped.message).toContain("META_REVIEW_GATE_TRANSITION_INVALID");
  });

  it("maps generic errors to META_REVIEW_UNKNOWN_ERROR", () => {
    const mapped = toMetaReviewError(new Error("unexpected failure"));
    expect(mapped.reasonCode).toBe("META_REVIEW_UNKNOWN_ERROR");
  });
});
