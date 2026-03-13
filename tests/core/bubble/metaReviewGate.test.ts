import { mkdtemp, readFile, rm, writeFile as writeFileFs } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import type { BubbleMetaReviewSnapshotState } from "../../../src/types/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-"));
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

function buildBoundMetaReviewerPaneResult(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  active: boolean;
}) {
  return {
    updated: true as const,
    record: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      tmuxSessionName: "pf_meta_structured",
      updatedAt: "2026-03-10T10:00:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: input.active,
        updatedAt: "2026-03-10T10:00:00.000Z"
      }
    }
  };
}

function defaultMetaReviewSnapshot(): BubbleMetaReviewSnapshotState {
  return {
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
  };
}

async function startAsyncMetaReviewGate(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  summary: string;
  now: Date;
}) {
  return applyMetaReviewGateOnConvergence(
    {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      summary: input.summary,
      now: input.now
    },
    {
      setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
        buildBoundMetaReviewerPaneResult({
          bubbleId: targetBubbleId,
          repoPath: input.repoPath,
          worktreePath: input.worktreePath,
          active
        }),
      notifyMetaReviewerSubmissionRequest: async () => {}
    }
  );
}

async function writeCanonicalMetaReviewSnapshot(input: {
  statePath: string;
  recommendation: "approve" | "rework" | "inconclusive";
  summary: string;
  updatedAt: string;
  reworkTargetMessage?: string | null;
}) {
  const loaded = await readStateSnapshot(input.statePath);
  await writeStateSnapshot(
    input.statePath,
    {
      ...loaded.state,
      meta_review: {
        ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
        last_autonomous_run_id: null,
        last_autonomous_status:
          input.recommendation === "inconclusive" ? "inconclusive" : "success",
        last_autonomous_recommendation: input.recommendation,
        last_autonomous_summary: input.summary,
        last_autonomous_report_ref: "artifacts/meta-review-last.md",
        last_autonomous_rework_target_message:
          input.reworkTargetMessage ?? null,
        last_autonomous_updated_at: input.updatedAt
      }
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "META_REVIEW_RUNNING"
    }
  );
}

describe("applyMetaReviewGateOnConvergence", () => {
  it("starts async meta-review and emits TASK kickoff when pane is available", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_01",
      task: "Async gate start"
    });
    const notifySpy = vi.fn(async () => {});

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:00:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        notifyMetaReviewerSubmissionRequest: notifySpy
      }
    );

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "meta_reviewer"
    });
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.active_role).toBe("meta_reviewer");
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("routes to human_gate_run_failed when pane binding is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_02",
      task: "Async gate run-failed fallback"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:01:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async () => ({
          updated: false as const,
          reason: "no_runtime_session" as const
        })
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_RUN_FAILED"
    );
  });

  it("routes to human_gate_run_failed when structured submit request delivery fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_03",
      task: "Async gate notify failure"
    });

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:02:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        notifyMetaReviewerSubmissionRequest: async () => {
          throw new Error("tmux send failed");
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("bypasses meta-review run when sticky_human_gate is already true", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_01",
      task: "Sticky gate bypass"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true,
          last_autonomous_status: "inconclusive",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "Sticky human gate active.",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_updated_at: "2026-03-12T12:03:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged for meta-review.",
      now: new Date("2026-03-12T12:03:10.000Z")
    });

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });
});

describe("recoverMetaReviewGateFromSnapshot", () => {
  it("hydrates empty snapshot during recover and writes canonical artifacts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_empty_snapshot_01",
      task: "Recover hydrate empty snapshot"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:09:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:09:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_run_failed");
    expect(recovered.state.state).toBe("META_REVIEW_FAILED");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_status: "error",
      last_autonomous_recommendation: "inconclusive",
      last_autonomous_summary: "Converged.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md"
    });
    expect(recovered.state.meta_review?.last_autonomous_updated_at).not.toBeNull();

    const reportMarkdown = await readFile(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      "utf8"
    );
    const reportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const reportJson = JSON.parse(reportJsonRaw) as {
      recommendation: string;
      status: string;
      report_ref: string;
    };

    expect(reportMarkdown).toContain("# Meta Review Report");
    expect(reportJson).toMatchObject({
      recommendation: "inconclusive",
      status: "error",
      report_ref: "artifacts/meta-review-last.md"
    });
  });

  it("routes approve snapshot to human gate", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_01",
      task: "Recover approve"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:10:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_status: "success",
      last_autonomous_recommendation: "approve",
      last_autonomous_summary: "Approve recommendation.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_updated_at: "2026-03-12T12:10:01.000Z"
    });
  });

  it("routes inconclusive snapshot to human gate", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_inconclusive_01",
      task: "Recover inconclusive"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:11:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "inconclusive",
      summary: "Inconclusive recommendation.",
      updatedAt: "2026-03-12T12:11:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:11:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_inconclusive");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
  });

  it("routes rework snapshot to auto_rework and increments auto_rework_count", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_01",
      task: "Recover rework"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "rework",
      summary: "Need one more rework.",
      reworkTargetMessage: "Fix edge-case behavior.",
      updatedAt: "2026-03-12T12:12:01.000Z"
    });
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          recommendation: "rework",
          summary: "Need one more rework.",
          report_ref: "artifacts/meta-review-last.md",
          report_json: {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 1,
            findings_artifact_ref: "artifacts/rework-findings.json",
            findings_run_id: "snapshot_rework_01"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:02.000Z")
    });
    expect(recovered.route).toBe("auto_rework");
    expect(recovered.state.state).toBe("RUNNING");
    expect(recovered.state.active_role).toBe("implementer");
    expect(recovered.state.meta_review?.auto_rework_count).toBe(1);
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(recovered.gateEnvelope.payload.decision).toBe("revise");

    const autoReworkReportMarkdown = await readFile(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      "utf8"
    );
    const autoReworkReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const autoReworkReportJson = JSON.parse(autoReworkReportJsonRaw) as {
      recommendation: string;
      status: string;
      report_ref: string;
    };
    expect(autoReworkReportMarkdown).toContain("# Meta Review Report");
    expect(autoReworkReportJson).toMatchObject({
      recommendation: "rework",
      status: "success",
      report_ref: "artifacts/meta-review-last.md"
    });
  });

  it("routes injected rework runResult to auto_rework and normalizes report_ref to canonical artifact", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_injected_01",
      task: "Recover rework injected runResult"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:30.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:32.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_rework_injected_01",
        status: "success",
        recommendation: "rework",
        summary: "Injected rework recommendation.",
        report_ref: "artifacts/custom-run-report.md",
        rework_target_message: "Inject rework message.",
        updated_at: "2026-03-12T12:12:31.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_rework_injected_01"
        }
      }
    });

    expect(recovered.route).toBe("auto_rework");
    expect(recovered.state.state).toBe("RUNNING");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_run_id: "run_recover_rework_injected_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: "Injected rework recommendation.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_rework_target_message: "Inject rework message.",
      last_autonomous_updated_at: "2026-03-12T12:12:31.000Z",
      auto_rework_count: 1
    });
    expect(recovered.metaReviewRun?.report_ref).toBe("artifacts/meta-review-last.md");

    const injectedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const injectedReportJson = JSON.parse(injectedReportJsonRaw) as {
      report_ref: string;
    };
    expect(injectedReportJson.report_ref).toBe("artifacts/meta-review-last.md");
  });

  it("records parser divergence as claim_diagnostics without mutating provided warnings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_parser_divergence_01",
      task: "Recover rework parser divergence diagnostics"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:35.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const providedWarnings = [
      {
        reason_code: "META_REVIEW_RUNNER_ERROR" as const,
        message: "existing warning should remain untouched"
      }
    ];
    const providedRunResult = {
      bubbleId: bubble.bubbleId,
      depth: "standard" as const,
      run_id: "run_recover_rework_parser_divergence_01",
      status: "success" as const,
      recommendation: "rework" as const,
      summary: "No findings remain after follow-up checks.",
      report_ref: "artifacts/custom-report.md",
      rework_target_message: "Retry after reviewer follow-up.",
      updated_at: "2026-03-12T12:12:36.000Z",
      lifecycle_state: "META_REVIEW_RUNNING" as const,
      warnings: [...providedWarnings],
      report_json: {
        findings_claim_state: "open_findings",
        findings_claim_source: "meta_review_artifact",
        findings_count: 1,
        findings_artifact_ref: "artifacts/rework-findings.json",
        findings_run_id: "run_recover_rework_parser_divergence_01"
      }
    };

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:37.000Z"),
      runResult: providedRunResult
    });

    expect(recovered.route).toBe("auto_rework");
    expect(providedRunResult.warnings).toEqual(providedWarnings);
    expect(recovered.metaReviewRun?.warnings).toEqual(providedWarnings);
    const claimDiagnostics = recovered.metaReviewRun?.report_json?.claim_diagnostics;
    expect(Array.isArray(claimDiagnostics)).toBe(true);
    expect(
      (claimDiagnostics as unknown[]).some(
        (entry) =>
          typeof entry === "string" &&
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
      )
    ).toBe(true);

    const persistedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const persistedReportJson = JSON.parse(persistedReportJsonRaw) as {
      report_json?: { claim_diagnostics?: unknown[] };
    };
    expect(
      persistedReportJson.report_json?.claim_diagnostics?.some(
        (entry) =>
          typeof entry === "string" &&
          entry.includes("CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC")
      )
    ).toBe(true);
  });

  it("does not emit claim_diagnostics when parser and structured claim are aligned", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_parser_aligned_01",
      task: "Recover rework parser aligned diagnostics"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:38.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:40.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_rework_parser_aligned_01",
        status: "success",
        recommendation: "rework",
        summary: "P2 findings remain open after follow-up checks.",
        report_ref: "artifacts/custom-report.md",
        rework_target_message: "Retry after follow-up.",
        updated_at: "2026-03-12T12:12:39.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_rework_parser_aligned_01"
        }
      }
    });

    expect(recovered.route).toBe("auto_rework");
    expect(recovered.metaReviewRun?.report_json?.claim_diagnostics).toBeUndefined();

    const persistedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const persistedReportJson = JSON.parse(persistedReportJsonRaw) as {
      report_json?: { claim_diagnostics?: unknown[] };
    };
    expect(persistedReportJson.report_json?.claim_diagnostics).toBeUndefined();
  });

  it("fails closed when report_json findings_claim_state enum is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_invalid_state_enum_01",
      task: "Recover rework invalid claim state enum"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:41.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:43.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_rework_invalid_state_enum_01",
        status: "success",
        recommendation: "rework",
        summary: "Invalid state enum.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Retry.",
        updated_at: "2026-03-12T12:12:42.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "opened",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_rework_invalid_state_enum_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain("CLAIM_STATE_REQUIRED");
  });

  it("fails closed when report_json findings_claim_source enum is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_invalid_source_enum_01",
      task: "Recover rework invalid claim source enum"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:44.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:46.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_rework_invalid_source_enum_01",
        status: "success",
        recommendation: "rework",
        summary: "Invalid source enum.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Retry.",
        updated_at: "2026-03-12T12:12:45.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_guess",
          findings_count: 1,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_rework_invalid_source_enum_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain("CLAIM_SOURCE_INVALID");
  });

  it("fails closed when approve recommendation carries open_findings structured claim", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_open_claim_01",
      task: "Recover approve contradictory open claim"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:47.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:49.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_open_claim_01",
        status: "success",
        recommendation: "approve",
        summary: "Approve but claim says findings are still open.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:48.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_approve_open_claim_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "recommendation=approve cannot carry findings_claim_state=open_findings"
    );
  });

  it("routes rework recommendation to human_gate_budget_exhausted when auto-rework budget is exhausted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_budget_exhausted_01",
      task: "Recover budget exhausted"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:40.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    if (loaded.state.meta_review === undefined) {
      throw new Error("Expected meta_review snapshot.");
    }
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...loaded.state.meta_review,
          auto_rework_count: 5,
          auto_rework_limit: 5
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:42.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_budget_exhausted_01",
        status: "success",
        recommendation: "rework",
        summary: "Budget exhausted, escalate to human gate.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Would rework if budget allowed.",
        updated_at: "2026-03-12T12:12:41.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_budget_exhausted_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_budget_exhausted");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_recommendation: "rework",
      last_autonomous_rework_target_message: "Would rework if budget allowed."
    });
  });

  it("fails closed with META_REVIEW_FINDINGS_ARTIFACT_REQUIRED when rework claim lacks artifact/run linkage", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_artifact_required_01",
      task: "Recover rework missing artifact linkage"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:50.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:52.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_artifact_required_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework without linkage",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:51.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_ARTIFACT_REQUIRED"
    );
  });

  it("fails closed with META_REVIEW_FINDINGS_COUNT_MISMATCH when rework claim count parity is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_count_mismatch_01",
      task: "Recover rework count mismatch"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:57.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_count_mismatch_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework with invalid count parity",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:56.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_artifact_ref: "artifacts/rework-findings.json",
          findings_run_id: "run_recover_count_mismatch_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_COUNT_MISMATCH"
    );
  });

  it("routes to human_gate_dispatch_failed when rework snapshot has no target message", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_02",
      task: "Recover rework missing target"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:13:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "rework",
      summary: "Snapshot has message, injected runResult drops it.",
      reworkTargetMessage: "snapshot message",
      updatedAt: "2026-03-12T12:13:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:13:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "success",
          recommendation: "rework",
          summary: "Run result is missing rework message.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:13:01.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      }
    );
    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: "Run result is missing rework message.",
      last_autonomous_rework_target_message:
        "Meta-review gate fallback rework target unavailable."
    });
    expect(recovered.state.meta_review?.sticky_human_gate).toBe(true);
    expect(recovered.metaReviewRun?.rework_target_message).toBeNull();

    const dispatchFailedReportMarkdown = await readFile(
      bubble.paths.metaReviewLastMarkdownArtifactPath,
      "utf8"
    );
    const dispatchFailedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const dispatchFailedReportJson = JSON.parse(dispatchFailedReportJsonRaw) as {
      recommendation: string;
      status: string;
      report_ref: string;
    };
    expect(dispatchFailedReportMarkdown).toContain("# Meta Review Report");
    expect(dispatchFailedReportJson).toMatchObject({
      recommendation: "rework",
      status: "success",
      report_ref: "artifacts/meta-review-last.md"
    });
  });

  it("routes error status to META_REVIEW_FAILED with human_gate_run_failed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_error_01",
      task: "Recover error"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "inconclusive",
      summary: "Runner failed.",
      updatedAt: "2026-03-12T12:14:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:14:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "error",
          recommendation: "inconclusive",
          summary: "Runner failed.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:14:01.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      }
    );
    expect(recovered.route).toBe("human_gate_run_failed");
    expect(recovered.state.state).toBe("META_REVIEW_FAILED");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_status: "error",
      last_autonomous_recommendation: "inconclusive",
      last_autonomous_summary: "Runner failed.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_updated_at: "2026-03-12T12:14:01.000Z"
    });
  });

  it("hydrates snapshot from provided runResult values and keeps metadata coherent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_provided_run_01",
      task: "Recover provided run snapshot hydrate"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:30.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:32.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_provided_01",
        status: "success",
        recommendation: "approve",
        summary: "Provided recovery recommendation.",
        report_ref: "artifacts/recovered-report-custom.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:14:31.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: []
      }
    });
    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_run_id: "run_recover_provided_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "approve",
      last_autonomous_summary: "Provided recovery recommendation.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: "2026-03-12T12:14:31.000Z"
    });
    expect(recovered.metaReviewRun?.report_ref).toBe("artifacts/meta-review-last.md");
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      latest_recommendation:
        recovered.state.meta_review?.last_autonomous_recommendation
    });
  });

  it("persists markdown-write warning into canonical recover JSON when markdown write fails only", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_partial_artifact_warning_01",
      task: "Recover partial artifact warning"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:40.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:14:42.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_recover_partial_warning_01",
          status: "success",
          recommendation: "approve",
          summary: "Recover route should persist warning in JSON when markdown write fails.",
          report_ref: "artifacts/non-canonical.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:14:41.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      },
      {
        writeFile: async (path, content, options) => {
          if (path === bubble.paths.metaReviewLastMarkdownArtifactPath) {
            throw new Error("simulated markdown write failure");
          }
          await writeFileFs(path, content, options);
        }
      }
    );

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.metaReviewRun?.warnings).toEqual([
      {
        reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
        message: "artifacts/meta-review-last.md: simulated markdown write failure"
      }
    ]);
    expect(recovered.state.meta_review?.last_autonomous_report_ref).toBe(
      "artifacts/meta-review-last.md"
    );

    const persistedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const persistedReportJson = JSON.parse(persistedReportJsonRaw) as {
      report_ref: string;
      warnings: Array<{ reason_code: string; message: string }>;
    };
    expect(persistedReportJson.report_ref).toBe("artifacts/meta-review-last.md");
    expect(persistedReportJson.warnings).toEqual([
      {
        reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
        message: "artifacts/meta-review-last.md: simulated markdown write failure"
      }
    ]);
    await expect(
      readFile(bubble.paths.metaReviewLastMarkdownArtifactPath, "utf8")
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("surfaces structured warning when recover artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_artifact_warning_01",
      task: "Recover warning fallback"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:40.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:14:42.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_recover_warning_01",
          status: "success",
          recommendation: "approve",
          summary: "Recovery should continue after artifact write warning.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:14:41.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      },
      {
        writeFile: async () => {
          throw new Error("simulated recover artifact write failure");
        }
      }
    );

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_recommendation: "approve",
      last_autonomous_summary:
        "Recovery should continue after artifact write warning."
    });
    expect(recovered.metaReviewRun?.warnings).toContainEqual({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message:
        "artifacts/meta-review-last.json: simulated recover artifact write failure"
    });
    expect(recovered.metaReviewRun?.warnings).toContainEqual({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message:
        "artifacts/meta-review-last.md: simulated recover artifact write failure"
    });
  });

  it("captures report-json artifact parse diagnostics instead of silently swallowing them", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_artifact_parse_diag_01",
      task: "Recover report-json parse diagnostics"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:50.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "{ invalid json",
      "utf8"
    );

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:14:52.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_artifact_parse_diag_01",
        status: "success",
        recommendation: "approve",
        summary: "Approve with malformed artifact JSON fallback.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:14:51.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: []
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    const claimDiagnostics = recovered.metaReviewRun?.report_json?.claim_diagnostics;
    expect(Array.isArray(claimDiagnostics)).toBe(true);
    expect(
      (claimDiagnostics as unknown[]).some(
        (entry) =>
          typeof entry === "string" &&
          entry.includes("META_REVIEW_REPORT_JSON_ARTIFACT_PARSE_DIAGNOSTIC")
      )
    ).toBe(true);
  });

  it("throws state conflict when runResult differs from canonical snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_conflict_01",
      task: "Recover conflict"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:15:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:15:01.000Z"
    });

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:15:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "success",
          recommendation: "approve",
          summary: "Approve recommendation.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: null,
          updated_at: "2026-03-12T12:15:05.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: []
        }
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
  });

  it("deactivates meta-review pane binding after recovery route", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_deactivate_01",
      task: "Recover deactivation"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:16:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:16:01.000Z"
    });

    const setPaneSpy = vi.fn(async ({ bubbleId: targetBubbleId, active }: {
      bubbleId: string;
      active: boolean;
    }) =>
      buildBoundMetaReviewerPaneResult({
        bubbleId: targetBubbleId,
        repoPath,
        worktreePath: bubble.paths.worktreePath,
        active
      })
    );

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:16:02.000Z")
      },
      {
        setMetaReviewerPaneBinding: setPaneSpy
      }
    );

    expect(recovered.route).toBe("human_gate_approve");
    expect(setPaneSpy).toHaveBeenCalled();
    expect(
      setPaneSpy.mock.calls.some(([args]) => args.active === false)
    ).toBe(true);
  });

  it("rejects recovery when lifecycle is not META_REVIEW_RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_invalid_01",
      task: "Recover invalid lifecycle"
    });

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:17:00.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });
  });

  it("appends human gate envelope to transcript and inbox on approve recovery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_transcript_01",
      task: "Recover transcript write"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:18:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:18:01.000Z"
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:18:02.000Z")
    });
    expect(recovered.route).toBe("human_gate_approve");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(transcript.at(-1)?.type).toBe("APPROVAL_REQUEST");
    expect(inbox.at(-1)?.type).toBe("APPROVAL_REQUEST");
  });
});
