import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile as writeFileFs } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
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

async function writeReworkFindingsArtifact(input: {
  artifactsDir: string;
  openTotal: number;
}): Promise<{ ref: string; digest: string }> {
  const ref = "artifacts/rework-findings.json";
  const findings = Array.from({ length: input.openTotal }, (_, index) => ({
    id: `f_${index + 1}`,
    status: "open"
  }));
  const raw = `${JSON.stringify(
    {
      open_total: input.openTotal,
      findings
    },
    null,
    2
  )}\n`;
  await writeFileFs(join(input.artifactsDir, "rework-findings.json"), raw, "utf8");
  const digest = createHash("sha256").update(raw, "utf8").digest("hex");
  return { ref, digest };
}

function buildReworkReportJson(input: {
  runId: string;
  openTotal: number;
  artifactRef: string;
  digest: string;
}): Record<string, unknown> {
  return {
    findings_claim_state: "open_findings",
    findings_claim_source: "meta_review_artifact",
    findings_count: input.openTotal,
    findings_artifact_ref: input.artifactRef,
    meta_review_run_id: input.runId,
    findings_digest_sha256: input.digest,
    findings_artifact_status: "available"
  };
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
    const setPaneCalls: boolean[] = [];

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:02:00.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => {
          setPaneCalls.push(active);
          return buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          });
        },
        notifyMetaReviewerSubmissionRequest: async () => {
          throw new Error("tmux send failed");
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(setPaneCalls).toEqual([true, false]);
  });

  it("deactivates meta-reviewer pane when TASK append fails then fallback route succeeds", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_04",
      task: "Async gate append failure fallback"
    });
    const setPaneCalls: boolean[] = [];

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:02:30.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => {
          setPaneCalls.push(active);
          return buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          });
        },
        notifyMetaReviewerSubmissionRequest: async () => {},
        appendProtocolEnvelope: async (input) => {
          if (input.envelope.type === "TASK") {
            throw new Error("simulated TASK append failure");
          }
          return appendProtocolEnvelope(input);
        }
      }
    );

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(setPaneCalls).toEqual([true, false]);
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
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          run_id: "run_sticky_bypass_parity_01",
          report_json: {
            findings_count: 2,
            findings_claimed_open_total: 2,
            findings_artifact_open_total: 1,
            findings_artifact_status: "available",
            findings_digest_sha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            meta_review_run_id: "run_sticky_bypass_parity_01",
            findings_parity_status: "guard_failed"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
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
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_artifact_open_total: 1,
      findings_parity_status: "guard_failed",
      meta_review_run_id: "run_sticky_bypass_parity_01"
    });
  });

  it("keeps positive findings summary when structured parity metadata proves open findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_summary_aligned_01",
      task: "Sticky summary parity alignment"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          run_id: "run_sticky_summary_aligned_01",
          report_json: {
            findings_count: 8,
            findings_claimed_open_total: 8,
            findings_artifact_open_total: 8,
            findings_artifact_status: "available",
            findings_digest_sha256:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            meta_review_run_id: "run_sticky_summary_aligned_01",
            findings_parity_status: "ok"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const summary = "R6 review: 8 deduplicated findings remain open.";
    const result = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary,
      now: new Date("2026-03-13T12:03:20.000Z")
    });

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.gateEnvelope.payload.summary).toBe(summary);
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 8,
      findings_artifact_open_total: 8,
      findings_parity_status: "ok"
    });
    expect(
      result.gateEnvelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
  });

  it("keeps positive findings summary unchanged when structured parity proof is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_summary_normalized_01",
      task: "Sticky summary normalization"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true
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
      summary: "R6 review: 8 deduplicated findings remain open.",
      now: new Date("2026-03-13T12:03:30.000Z")
    });

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.gateEnvelope.payload.summary).toBe(
      "R6 review: 8 deduplicated findings remain open."
    );
    expect(
      result.gateEnvelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
  });

  it("normalizes positive findings summary with METADATA_MISMATCH when non-approve parity invariants are inconsistent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_summary_mismatch_01",
      task: "Sticky summary mismatch normalization"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const originalSummary = "R7 reviewer converged with 4 open findings.";
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          run_id: "run_sticky_summary_mismatch_01",
          report_json: {
            findings_count: 0,
            findings_claimed_open_total: 0,
            findings_artifact_open_total: 0,
            findings_artifact_status: "available",
            findings_digest_sha256:
              "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            meta_review_run_id: "run_sticky_summary_mismatch_01",
            findings_parity_status: "mismatch"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await applyMetaReviewGateOnConvergence({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: originalSummary,
      now: new Date("2026-03-13T12:03:35.000Z")
    });

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_APPROVAL_SUMMARY_NORMALIZED"
    );
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH"
    );
    expect(result.gateEnvelope.payload.summary).toContain(
      "conflicts with structured parity metadata"
    );
    expect(result.gateEnvelope.payload.summary).not.toContain(
      "structured parity proof is unavailable"
    );
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      approval_summary_normalized: true,
      approval_summary_normalization_reason_code:
        "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH",
      approval_summary_normalization_original_summary: originalSummary
    });
  });

  it("restores RUNNING when sticky APPROVAL_REQUEST append fails after staged transition without staged-restore fall-through", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_append_restore_01",
      task: "Sticky append failure restore"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const writeCalls: Array<{
      expectedState: string | undefined;
      state: string;
    }> = [];
    const trackingWriteState: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      writeCalls.push({
        expectedState: options?.expectedState,
        state: state.state
      });
      return writeStateSnapshot(statePath, state, options);
    };

    let thrown: unknown;
    try {
      await applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "R6 review: 8 deduplicated findings remain open.",
          now: new Date("2026-03-13T12:03:40.000Z")
        },
        {
          appendProtocolEnvelope: async (input) => {
            if (input.envelope.type === "APPROVAL_REQUEST") {
              throw new Error("simulated approval append failure");
            }
            return appendProtocolEnvelope(input);
          },
          writeStateSnapshot: trackingWriteState
        }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });
    expect(
      (
        thrown as {
          diagnostics?: {
            rollbackReasonCode?: string;
            rollbackOutcome?: string;
          };
        }
      ).diagnostics
    ).toMatchObject({
      rollbackReasonCode: "META_REVIEW_GATE_ROLLBACK_APPLIED",
      rollbackOutcome: "applied"
    });

    const finalState = await readStateSnapshot(bubble.paths.statePath);
    expect(finalState.state.state).toBe("RUNNING");
    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((entry) => entry.type === "APPROVAL_REQUEST")).toBe(false);
    expect(
      writeCalls.some(
        (call) =>
          call.expectedState === "READY_FOR_APPROVAL" && call.state === "RUNNING"
      )
    ).toBe(false);
  });

  it("emits explicit reason-coded diagnostics when sticky append rollback and staged restore both fail", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_sticky_append_restore_conflict_01",
      task: "Sticky append rollback diagnostics"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const writeStateSnapshotWithRollbackFailure: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      if (
        options?.expectedState === "READY_FOR_HUMAN_APPROVAL"
        && state.state === "RUNNING"
      ) {
        throw new StateStoreConflictError("simulated rollback conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    let thrown: unknown;
    try {
      await applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "R6 review: 8 deduplicated findings remain open.",
          now: new Date("2026-03-13T12:03:50.000Z")
        },
        {
          appendProtocolEnvelope: async (input) => {
            if (input.envelope.type === "APPROVAL_REQUEST") {
              throw new Error("simulated approval append failure");
            }
            return appendProtocolEnvelope(input);
          },
          writeStateSnapshot: writeStateSnapshotWithRollbackFailure
        }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
    expect(
      (thrown as { diagnostics?: { rollbackReasonCode?: string } }).diagnostics
    ).toMatchObject({
      rollbackReasonCode: "META_REVIEW_GATE_ROLLBACK_STATE_CONFLICT"
    });
    expect(String((thrown as Error).message)).toContain(
      "rollback_reason_code=META_REVIEW_GATE_ROLLBACK_STATE_CONFLICT"
    );
    expect(String((thrown as Error).message)).toContain(
      "restore_reason_code=META_REVIEW_GATE_STAGED_READY_RESTORE_STATE_CONFLICT"
    );
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

  it("routes approve runResult with parity metadata to human gate and preserves parity fields", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_parity_metadata_01",
      task: "Recover approve parity metadata"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:10.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:12.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_parity_metadata_01",
        status: "success",
        recommendation: "approve",
        summary: "Approve route with explicit parity metadata.",
        report_ref: "artifacts/custom-approve-report.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:10:11.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_claimed_open_total: 0,
          findings_artifact_open_total: 0,
          findings_artifact_status: "available",
          findings_digest_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          meta_review_run_id: "run_recover_approve_parity_metadata_01",
          findings_parity_status: "ok"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 0,
      findings_artifact_open_total: 0,
      findings_artifact_status: "available",
      findings_digest_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      meta_review_run_id: "run_recover_approve_parity_metadata_01",
      findings_parity_status: "ok"
    });
  });

  it("does not normalize approve-route summary when parity proof is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_summary_no_parity_01",
      task: "Recover approve summary no parity normalization"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:20.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "R10 review: 3 deduplicated findings remain open.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:22.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_summary_no_parity_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/custom-approve-report.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:10:21.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: []
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(
      recovered.gateEnvelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
  });

  it("keeps approve-route positive summary unchanged when structured parity metadata is consistent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_summary_consistent_01",
      task: "Recover approve summary consistent non-trigger"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:30.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "R10 review: 2 deduplicated findings remain open.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:32.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_summary_consistent_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/custom-approve-report.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:10:31.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_claimed_open_total: 0,
          findings_artifact_open_total: 0,
          findings_artifact_status: "available",
          findings_digest_sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          meta_review_run_id: "run_recover_approve_summary_consistent_01",
          findings_parity_status: "ok"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(
      recovered.gateEnvelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
  });

  it("normalizes approve-route summary with METADATA_MISMATCH when parity guard invariants are inconsistent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_summary_inconsistent_01",
      task: "Recover approve summary inconsistent normalization"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:34.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "R10 review: 2 deduplicated findings remain open.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:36.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_summary_inconsistent_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/custom-approve-report.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:10:35.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_claimed_open_total: 0,
          findings_artifact_open_total: 0,
          findings_artifact_status: "available",
          findings_digest_sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          meta_review_run_id: "run_recover_approve_summary_inconsistent_01",
          findings_parity_status: "mismatch"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH"
    );
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "META_REVIEW_GATE_APPROVAL_SUMMARY_PARITY_UNAVAILABLE"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      approval_summary_normalized: true,
      approval_summary_normalization_reason_code:
        "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH"
    });
  });

  it("keeps approve-route summary unchanged when normalization trigger preconditions are not met", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_summary_no_trigger_01",
      task: "Recover approve summary no trigger"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:40.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "Approve route narrative without findings claim.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:10:42.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_summary_no_trigger_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/custom-approve-report.md",
        rework_target_message: null,
        updated_at: "2026-03-12T12:10:41.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_claimed_open_total: 0,
          findings_artifact_open_total: 0,
          findings_artifact_status: "available",
          findings_digest_sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          meta_review_run_id: "run_recover_approve_summary_no_trigger_01",
          findings_parity_status: "ok"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(
      recovered.gateEnvelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
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
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          recommendation: "rework",
          summary: "Need one more rework.",
          report_ref: "artifacts/meta-review-last.md",
          report_json: buildReworkReportJson({
            runId: "snapshot_rework_01",
            openTotal: 1,
            artifactRef: findingsArtifact.ref,
            digest: findingsArtifact.digest
          })
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

  it("hydrates current run metadata into READY_FOR_APPROVAL restore when auto-rework dispatch append fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_dispatch_restore_hydrated_01",
      task: "Recover rework dispatch restore hydration"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-14T10:01:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const staleRunId = "run_recover_rework_dispatch_stale_01";
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          last_autonomous_run_id: staleRunId,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Stale summary before auto-rework dispatch failure.",
          last_autonomous_report_ref: "artifacts/stale-before-dispatch.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-14T09:59:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });
    const runId = "run_recover_rework_dispatch_restore_hydrated_01";
    const runSummary =
      "Current rework run should remain canonical during dispatch-failure restore.";
    const runUpdatedAt = "2026-03-14T10:01:01.000Z";

    const writeCalls: Array<{
      expectedState: string | undefined;
      state: string;
      metaReview: BubbleMetaReviewSnapshotState | undefined;
    }> = [];
    const trackingWriteState: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      writeCalls.push({
        expectedState: options?.expectedState,
        state: state.state,
        metaReview: state.meta_review
      });
      return writeStateSnapshot(statePath, state, options);
    };

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-14T10:01:02.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: runId,
          status: "success",
          recommendation: "rework",
          summary: runSummary,
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: "Re-run implementer hardening flow.",
          updated_at: runUpdatedAt,
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: [],
          report_json: buildReworkReportJson({
            runId,
            openTotal: 1,
            artifactRef: findingsArtifact.ref,
            digest: findingsArtifact.digest
          })
        }
      },
      {
        appendProtocolEnvelope: async (input) => {
          if (input.envelope.type === "APPROVAL_DECISION") {
            throw new Error("simulated auto-rework dispatch append failure");
          }
          return appendProtocolEnvelope(input);
        },
        writeStateSnapshot: trackingWriteState
      }
    );

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_run_id: runId,
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: runSummary,
      last_autonomous_updated_at: runUpdatedAt
    });
    expect(recovered.state.meta_review?.last_autonomous_run_id).not.toBe(staleRunId);

    const restoredReadyWrite = writeCalls.find(
      (call) =>
        call.expectedState === "RUNNING" &&
        call.state === "READY_FOR_APPROVAL"
    );
    expect(restoredReadyWrite).toBeDefined();
    expect(restoredReadyWrite?.metaReview).toMatchObject({
      last_autonomous_run_id: runId,
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: runSummary,
      last_autonomous_updated_at: runUpdatedAt
    });
    expect(restoredReadyWrite?.metaReview?.last_autonomous_run_id).not.toBe(staleRunId);
  });

  it("keeps current run metadata when second append rollback follows auto-rework dispatch failure", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_dispatch_rollback_hydrated_01",
      task: "Recover rework dispatch rollback hydration"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-14T10:02:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const staleRunId = "run_recover_rework_dispatch_stale_rollback_01";
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          last_autonomous_run_id: staleRunId,
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Stale summary before rollback test.",
          last_autonomous_report_ref: "artifacts/stale-before-rollback.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-14T10:00:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      }
    );

    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });
    const runId = "run_recover_rework_dispatch_rollback_hydrated_01";
    const runSummary =
      "Current rework run should remain canonical after second-append rollback.";
    const runUpdatedAt = "2026-03-14T10:02:01.000Z";

    let thrown: unknown;
    try {
      await recoverMetaReviewGateFromSnapshot(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged.",
          now: new Date("2026-03-14T10:02:02.000Z"),
          runResult: {
            bubbleId: bubble.bubbleId,
            depth: "standard",
            run_id: runId,
            status: "success",
            recommendation: "rework",
            summary: runSummary,
            report_ref: "artifacts/meta-review-last.md",
            rework_target_message: "Re-run implementer hardening flow.",
            updated_at: runUpdatedAt,
            lifecycle_state: "META_REVIEW_RUNNING",
            warnings: [],
            report_json: buildReworkReportJson({
              runId,
              openTotal: 1,
              artifactRef: findingsArtifact.ref,
              digest: findingsArtifact.digest
            })
          }
        },
        {
          appendProtocolEnvelope: async (input) => {
            if (input.envelope.type === "APPROVAL_DECISION") {
              throw new Error("simulated auto-rework dispatch append failure");
            }
            if (input.envelope.type === "APPROVAL_REQUEST") {
              throw new Error(
                "simulated approval request append failure after dispatch fallback"
              );
            }
            return appendProtocolEnvelope(input);
          }
        }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });
    expect(
      (
        thrown as {
          diagnostics?: {
            rollbackReasonCode?: string;
            rollbackOutcome?: string;
            rollbackTargetState?: string;
          };
        }
      ).diagnostics
    ).toMatchObject({
      rollbackReasonCode: "META_REVIEW_GATE_ROLLBACK_APPLIED",
      rollbackOutcome: "applied",
      rollbackTargetState: "READY_FOR_APPROVAL"
    });

    const finalState = await readStateSnapshot(bubble.paths.statePath);
    expect(finalState.state.state).toBe("READY_FOR_APPROVAL");
    expect(finalState.state.meta_review).toMatchObject({
      last_autonomous_run_id: runId,
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: runSummary,
      last_autonomous_updated_at: runUpdatedAt
    });
    expect(finalState.state.meta_review?.last_autonomous_run_id).not.toBe(staleRunId);
  });

  it("routes injected rework runResult to auto_rework and preserves safe report_ref", async () => {
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
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 2
    });

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
        report_json: buildReworkReportJson({
          runId: "run_recover_rework_injected_01",
          openTotal: 2,
          artifactRef: findingsArtifact.ref,
          digest: findingsArtifact.digest
        })
      }
    });

    expect(recovered.route).toBe("auto_rework");
    expect(recovered.state.state).toBe("RUNNING");
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_run_id: "run_recover_rework_injected_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "rework",
      last_autonomous_summary: "Injected rework recommendation.",
      last_autonomous_report_ref: "artifacts/custom-run-report.md",
      last_autonomous_rework_target_message: "Inject rework message.",
      last_autonomous_updated_at: "2026-03-12T12:12:31.000Z",
      auto_rework_count: 1
    });
    expect(recovered.metaReviewRun?.report_ref).toBe("artifacts/custom-run-report.md");

    const injectedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const injectedReportJson = JSON.parse(injectedReportJsonRaw) as {
      report_ref: string;
    };
    expect(injectedReportJson.report_ref).toBe("artifacts/custom-run-report.md");
  });

  it("fails with explicit conflict reason when CAS retry sees incompatible round drift", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_cas_round_drift_01",
      task: "Recover rework CAS round drift conflict"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-13T12:20:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    let injectIncrementConflict = true;
    const writeStateWithInjectedConflict: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      const autoReworkCount = state.meta_review?.auto_rework_count;
      if (
        injectIncrementConflict &&
        options?.expectedState === "RUNNING" &&
        state.state === "RUNNING" &&
        autoReworkCount === 1
      ) {
        injectIncrementConflict = false;
        throw new StateStoreConflictError("simulated increment CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    let injectRoundDrift = true;
    const readStateWithRoundDrift: typeof readStateSnapshot = async (statePath) => {
      const loaded = await readStateSnapshot(statePath);
      if (
        !injectIncrementConflict &&
        injectRoundDrift &&
        loaded.state.state === "RUNNING"
      ) {
        injectRoundDrift = false;
        return {
          ...loaded,
          state: {
            ...loaded.state,
            round: loaded.state.round + 1
          }
        };
      }
      return loaded;
    };

    let thrown: unknown;
    try {
      await recoverMetaReviewGateFromSnapshot(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged.",
          now: new Date("2026-03-13T12:20:02.000Z"),
          runResult: {
            bubbleId: bubble.bubbleId,
            depth: "standard",
            run_id: "run_recover_rework_cas_round_drift_01",
            status: "success",
            recommendation: "rework",
            summary: "Rework with CAS interleaving round drift.",
            report_ref: "artifacts/meta-review-last.md",
            rework_target_message: "Retry with deterministic invariant checks.",
            updated_at: "2026-03-13T12:20:01.000Z",
            lifecycle_state: "META_REVIEW_RUNNING",
            warnings: [],
            report_json: buildReworkReportJson({
              runId: "run_recover_rework_cas_round_drift_01",
              openTotal: 1,
              artifactRef: findingsArtifact.ref,
              digest: findingsArtifact.digest
            })
          }
        },
        {
          writeStateSnapshot: writeStateWithInjectedConflict,
          readStateSnapshot: readStateWithRoundDrift
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
    expect(String((thrown as Error).message)).toContain(
      "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_INVARIANT"
    );
  });

  it("fails with explicit conflict reason when CAS retry sees run identity drift before counter increment", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_cas_run_identity_drift_01",
      task: "Recover rework CAS run identity drift conflict"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-13T12:20:05.000Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    let injectIncrementConflict = true;
    const writeStateWithInjectedConflict: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      const autoReworkCount = state.meta_review?.auto_rework_count;
      if (
        injectIncrementConflict &&
        options?.expectedState === "RUNNING" &&
        state.state === "RUNNING" &&
        autoReworkCount === 1
      ) {
        injectIncrementConflict = false;
        throw new StateStoreConflictError("simulated increment CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    let injectIdentityDrift = true;
    const readStateWithIdentityDrift: typeof readStateSnapshot = async (statePath) => {
      const loaded = await readStateSnapshot(statePath);
      if (
        !injectIncrementConflict &&
        injectIdentityDrift &&
        loaded.state.state === "RUNNING"
      ) {
        injectIdentityDrift = false;
        return {
          ...loaded,
          state: {
            ...loaded.state,
            meta_review: {
              ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
              auto_rework_count: 0,
              last_autonomous_run_id: "run_interleaving_writer_canonical_01",
              last_autonomous_summary: "Canonical interleaving run from another writer."
            }
          }
        };
      }
      return loaded;
    };

    let thrown: unknown;
    try {
      await recoverMetaReviewGateFromSnapshot(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged.",
          now: new Date("2026-03-13T12:20:07.000Z"),
          runResult: {
            bubbleId: bubble.bubbleId,
            depth: "standard",
            run_id: "run_recover_rework_cas_run_identity_drift_01",
            status: "success",
            recommendation: "rework",
            summary: "Rework with CAS run identity drift.",
            report_ref: "artifacts/meta-review-last.md",
            rework_target_message: "Retry with deterministic identity invariant checks.",
            updated_at: "2026-03-13T12:20:06.000Z",
            lifecycle_state: "META_REVIEW_RUNNING",
            warnings: [],
            report_json: buildReworkReportJson({
              runId: "run_recover_rework_cas_run_identity_drift_01",
              openTotal: 1,
              artifactRef: findingsArtifact.ref,
              digest: findingsArtifact.digest
            })
          }
        },
        {
          writeStateSnapshot: writeStateWithInjectedConflict,
          readStateSnapshot: readStateWithIdentityDrift
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });
    expect(String((thrown as Error).message)).toContain(
      "META_REVIEW_GATE_AUTO_REWORK_RETRY_RUN_IDENTITY_INVARIANT"
    );
  });

  it("does not raise run-identity conflict on CAS retry when run_id is absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_cas_run_identity_absent_01",
      task: "Recover rework CAS retry without run identity"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-13T12:20:08.000Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    let injectIncrementConflict = true;
    const writeStateWithInjectedConflict: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      const autoReworkCount = state.meta_review?.auto_rework_count;
      if (
        injectIncrementConflict &&
        options?.expectedState === "RUNNING" &&
        state.state === "RUNNING" &&
        autoReworkCount === 1
      ) {
        injectIncrementConflict = false;
        throw new StateStoreConflictError("simulated increment CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    let injectInterleavingRunIdentity = true;
    const readStateWithInterleavingRunIdentity: typeof readStateSnapshot = async (
      statePath
    ) => {
      const loaded = await readStateSnapshot(statePath);
      if (
        !injectIncrementConflict &&
        injectInterleavingRunIdentity &&
        loaded.state.state === "RUNNING"
      ) {
        injectInterleavingRunIdentity = false;
        return {
          ...loaded,
          state: {
            ...loaded.state,
            meta_review: {
              ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
              auto_rework_count: 0,
              last_autonomous_run_id: "run_interleaving_writer_canonical_absent_01",
              last_autonomous_summary: "Interleaving writer snapshot"
            }
          }
        };
      }
      return loaded;
    };

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-13T12:20:09.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          status: "success",
          recommendation: "rework",
          summary: "Rework with CAS retry but missing run identity.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: "Retry deterministically.",
          updated_at: "2026-03-13T12:20:08.500Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: [],
          report_json: buildReworkReportJson({
            runId: "run_recover_rework_cas_run_identity_absent_01",
            openTotal: 1,
            artifactRef: findingsArtifact.ref,
            digest: findingsArtifact.digest
          })
        }
      },
      {
        writeStateSnapshot: writeStateWithInjectedConflict,
        readStateSnapshot: readStateWithInterleavingRunIdentity
      }
    );

    expect(recovered.route).toBe("auto_rework");
    expect(recovered.state.state).toBe("RUNNING");
    expect(recovered.state.meta_review?.auto_rework_count).toBe(1);
    expect(recovered.state.meta_review?.last_autonomous_run_id).toBeNull();
  });

  it("accepts CAS retry when interleaving snapshot remains compatible and already incremented", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_cas_compatible_01",
      task: "Recover rework CAS compatible retry"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-13T12:20:10.000Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    let injectIncrementConflict = true;
    const writeStateWithInjectedConflict: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      const autoReworkCount = state.meta_review?.auto_rework_count;
      if (
        injectIncrementConflict &&
        options?.expectedState === "RUNNING" &&
        state.state === "RUNNING" &&
        autoReworkCount === 1
      ) {
        injectIncrementConflict = false;
        throw new StateStoreConflictError("simulated increment CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    let injectCompatibleSnapshot = true;
    const readStateWithCompatibleInterleaving: typeof readStateSnapshot = async (
      statePath
    ) => {
      const loaded = await readStateSnapshot(statePath);
      if (
        !injectIncrementConflict &&
        injectCompatibleSnapshot &&
        loaded.state.state === "RUNNING"
      ) {
        injectCompatibleSnapshot = false;
        return {
          ...loaded,
          state: {
            ...loaded.state,
            meta_review: {
              ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
              auto_rework_count: 1,
              last_autonomous_run_id: "run_stale_interleaving_snapshot",
              last_autonomous_summary: "Stale summary from interleaving writer."
            }
          }
        };
      }
      return loaded;
    };

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-13T12:20:12.000Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_recover_rework_cas_compatible_01",
          status: "success",
          recommendation: "rework",
          summary: "Rework with compatible CAS interleaving.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: "Proceed with deterministic retry acceptance.",
          updated_at: "2026-03-13T12:20:11.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: [],
          report_json: buildReworkReportJson({
            runId: "run_recover_rework_cas_compatible_01",
            openTotal: 1,
            artifactRef: findingsArtifact.ref,
            digest: findingsArtifact.digest
          })
        }
      },
      {
        writeStateSnapshot: writeStateWithInjectedConflict,
        readStateSnapshot: readStateWithCompatibleInterleaving
      }
    );

    expect(recovered.route).toBe("auto_rework");
    expect(recovered.state.state).toBe("RUNNING");
    expect(recovered.state.meta_review?.auto_rework_count).toBe(1);
    expect(recovered.state.meta_review?.last_autonomous_run_id).toBe(
      "run_stale_interleaving_snapshot"
    );
    expect(recovered.state.meta_review?.last_autonomous_summary).toBe(
      "Stale summary from interleaving writer."
    );
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
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

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
      report_json: buildReworkReportJson({
        runId: "run_recover_rework_parser_divergence_01",
        openTotal: 1,
        artifactRef: findingsArtifact.ref,
        digest: findingsArtifact.digest
      })
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
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

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
        report_json: buildReworkReportJson({
          runId: "run_recover_rework_parser_aligned_01",
          openTotal: 1,
          artifactRef: findingsArtifact.ref,
          digest: findingsArtifact.digest
        })
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
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

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
        report_json: buildReworkReportJson({
          runId: "run_recover_budget_exhausted_01",
          openTotal: 1,
          artifactRef: findingsArtifact.ref,
          digest: findingsArtifact.digest
        })
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

  it("fails closed with META_REVIEW_FINDINGS_RUN_LINK_MISSING when rework claim lacks meta_review_run_id linkage", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_run_link_missing_01",
      task: "Recover rework missing run-link metadata"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:53.000Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_run_link_missing_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework without run-link metadata.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:53.500Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: findingsArtifact.ref,
          findings_digest_sha256: findingsArtifact.digest,
          findings_artifact_status: "available"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_RUN_LINK_MISSING"
    );
  });

  it("fails closed with META_REVIEW_FINDINGS_RUN_LINK_MISSING when meta_review_run_id mismatches run_id", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_run_link_mismatch_01",
      task: "Recover rework run-link mismatch metadata"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:53.600Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.600Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_run_link_mismatch_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework with mismatched run-link metadata.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:54.100Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: findingsArtifact.ref,
          findings_digest_sha256: findingsArtifact.digest,
          findings_artifact_status: "available",
          meta_review_run_id: "run_recover_run_link_mismatch_other_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_RUN_LINK_MISSING"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_parity_status: "guard_failed",
      meta_review_run_id: "run_recover_run_link_mismatch_other_01"
    });
  });

  it("fails closed with META_REVIEW_FINDINGS_PARITY_GUARD when parity digest metadata is unavailable", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_parity_guard_01",
      task: "Recover rework parity guard"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.500Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.500Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_parity_guard_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework without parity digest metadata.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:55.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: findingsArtifact.ref,
          meta_review_run_id: "run_recover_parity_guard_01",
          findings_artifact_status: "available"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
  });

  it("retries transient findings artifact read failures and succeeds when a later attempt can read", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_read_retry_success_01",
      task: "Recover rework transient artifact read retry success"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.550Z")
    });
    expect(started.route).toBe("meta_review_running");

    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });
    const findingsArtifactPath = join(
      bubble.paths.artifactsDir,
      "rework-findings.json"
    );
    const retryDelaysMs: number[] = [];
    let transientFailures = 0;
    const readWithSingleTransientFailure = (async (
      filePath: string,
      encoding: BufferEncoding
    ) => {
      if (filePath === findingsArtifactPath && transientFailures === 0) {
        transientFailures += 1;
        const error = new Error("resource temporarily unavailable") as NodeJS.ErrnoException;
        error.code = "EAGAIN";
        throw error;
      }
      return readFile(filePath, encoding);
    }) as typeof readFile;

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:12:56.550Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_recover_read_retry_success_01",
          status: "success",
          recommendation: "rework",
          summary: "Rework with transient findings artifact read failure then success.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: "Need another revision.",
          updated_at: "2026-03-12T12:12:56.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: [],
          report_json: {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 1,
            findings_artifact_ref: findingsArtifact.ref,
            meta_review_run_id: "run_recover_read_retry_success_01",
            findings_digest_sha256: findingsArtifact.digest,
            findings_artifact_status: "available"
          }
        }
      },
      {
        readFile: readWithSingleTransientFailure,
        sleepForRetryMs: async (delayMs) => {
          retryDelaysMs.push(delayMs);
        }
      }
    );

    expect(transientFailures).toBe(1);
    expect(retryDelaysMs).toEqual([25]);
    expect(recovered.route).toBe("auto_rework");
  });

  it("fails closed after transient findings artifact read retry budget is exhausted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_read_retry_exhausted_01",
      task: "Recover rework transient artifact read retry exhausted"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.650Z")
    });
    expect(started.route).toBe("meta_review_running");

    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });
    const findingsArtifactPath = join(
      bubble.paths.artifactsDir,
      "rework-findings.json"
    );
    const retryDelaysMs: number[] = [];
    let readAttempts = 0;
    const readWithPersistentTransientFailure = (async (
      filePath: string,
      encoding: BufferEncoding
    ) => {
      if (filePath === findingsArtifactPath) {
        readAttempts += 1;
        const error = new Error("resource temporarily unavailable") as NodeJS.ErrnoException;
        error.code = "EAGAIN";
        throw error;
      }
      return readFile(filePath, encoding);
    }) as typeof readFile;

    const recovered = await recoverMetaReviewGateFromSnapshot(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:12:56.650Z"),
        runResult: {
          bubbleId: bubble.bubbleId,
          depth: "standard",
          run_id: "run_recover_read_retry_exhausted_01",
          status: "success",
          recommendation: "rework",
          summary: "Rework with persistent transient findings artifact read failures.",
          report_ref: "artifacts/meta-review-last.md",
          rework_target_message: "Need another revision.",
          updated_at: "2026-03-12T12:12:56.100Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: [],
          report_json: {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 1,
            findings_artifact_ref: findingsArtifact.ref,
            meta_review_run_id: "run_recover_read_retry_exhausted_01",
            findings_digest_sha256: findingsArtifact.digest,
            findings_artifact_status: "available"
          }
        }
      },
      {
        readFile: readWithPersistentTransientFailure,
        sleepForRetryMs: async (delayMs) => {
          retryDelaysMs.push(delayMs);
        }
      }
    );

    expect(readAttempts).toBe(3);
    expect(retryDelaysMs).toEqual([25, 50]);
    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "transient_retry_exhausted"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 1,
      findings_artifact_open_total: null,
      findings_parity_status: "guard_failed"
    });
  });

  it("fails closed with META_REVIEW_FINDINGS_PARITY_GUARD when findings artifact digest mismatches", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_digest_mismatch_01",
      task: "Recover rework digest mismatch"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.700Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:56.700Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_digest_mismatch_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework with digest mismatch.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:56.100Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: findingsArtifact.ref,
          meta_review_run_id: "run_recover_digest_mismatch_01",
          findings_digest_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          findings_artifact_status: "available"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 1,
      findings_artifact_open_total: 1,
      findings_parity_status: "guard_failed"
    });
  });

  it("fails closed with META_REVIEW_FINDINGS_PARITY_GUARD when artifact lacks explicit open-total fields", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_array_open_total_missing_01",
      task: "Recover rework array-only artifact open-total missing"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:56.800Z")
    });
    expect(started.route).toBe("meta_review_running");

    const artifactRef = "artifacts/rework-findings-array-only.json";
    const artifactRaw = `${JSON.stringify(
      {
        findings: [
          {
            id: "f_1",
            status: "open"
          }
        ]
      },
      null,
      2
    )}\n`;
    await writeFileFs(
      join(bubble.paths.artifactsDir, "rework-findings-array-only.json"),
      artifactRaw,
      "utf8"
    );
    const artifactDigest = createHash("sha256")
      .update(artifactRaw, "utf8")
      .digest("hex");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:57.800Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_array_open_total_missing_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework with findings array but without explicit open_total.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:57.200Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_artifact_ref: artifactRef,
          meta_review_run_id: "run_recover_array_open_total_missing_01",
          findings_digest_sha256: artifactDigest,
          findings_artifact_status: "available"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 1,
      findings_artifact_open_total: null,
      findings_parity_status: "guard_failed"
    });
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
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

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
          findings_artifact_ref: findingsArtifact.ref,
          meta_review_run_id: "run_recover_count_mismatch_01",
          findings_digest_sha256: findingsArtifact.digest,
          findings_artifact_status: "available"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_COUNT_MISMATCH"
    );
  });

  it("fails closed with META_REVIEW_FINDINGS_COUNT_MISMATCH when digest is valid but count parity diverges", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_rework_count_mismatch_post_digest_01",
      task: "Recover rework count mismatch after digest parity"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:58.000Z")
    });
    expect(started.route).toBe("meta_review_running");
    const findingsArtifact = await writeReworkFindingsArtifact({
      artifactsDir: bubble.paths.artifactsDir,
      openTotal: 1
    });

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:59.000Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_count_mismatch_post_digest_01",
        status: "success",
        recommendation: "rework",
        summary: "Rework with mismatched count after digest match.",
        report_ref: "artifacts/meta-review-last.md",
        rework_target_message: "Need another revision.",
        updated_at: "2026-03-12T12:12:58.500Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_artifact_ref: findingsArtifact.ref,
          meta_review_run_id: "run_recover_count_mismatch_post_digest_01",
          findings_digest_sha256: findingsArtifact.digest,
          findings_artifact_status: "available"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_COUNT_MISMATCH"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_artifact_open_total: 1,
      findings_parity_status: "mismatch"
    });
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
    expect(recovered.state.meta_review?.sticky_human_gate).toBe(false);
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
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      meta_review_gate_route: "human_gate_run_failed",
      meta_review_gate_reason_code: "META_REVIEW_GATE_RUN_FAILED",
      meta_review_gate_run_failed: true
    });
    expect(recovered.state.meta_review).toMatchObject({
      last_autonomous_status: "error",
      last_autonomous_recommendation: "inconclusive",
      last_autonomous_summary: "Runner failed.",
      last_autonomous_report_ref: "artifacts/meta-review-last.md",
      last_autonomous_updated_at: "2026-03-12T12:14:01.000Z"
    });
    expect(recovered.state.meta_review?.sticky_human_gate).toBe(false);
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
      last_autonomous_report_ref: "artifacts/recovered-report-custom.md",
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: "2026-03-12T12:14:31.000Z"
    });
    expect(recovered.metaReviewRun?.report_ref).toBe("artifacts/recovered-report-custom.md");
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
      "artifacts/non-canonical.md"
    );

    const persistedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const persistedReportJson = JSON.parse(persistedReportJsonRaw) as {
      report_ref: string;
      warnings: Array<{ reason_code: string; message: string }>;
    };
    expect(persistedReportJson.report_ref).toBe("artifacts/non-canonical.md");
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

  it("deactivates meta-review pane binding when recovery persist route throws before finish wrapper", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_deactivate_throw_01",
      task: "Recover deactivation throw path"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:16:10.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:16:11.000Z"
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

    const appendWithInjectedFailure: typeof appendProtocolEnvelope = async (input) => {
      if (input.envelope.type === "APPROVAL_REQUEST") {
        throw new Error("simulated APPROVAL_REQUEST append failure");
      }
      return appendProtocolEnvelope(input);
    };

    await expect(
      recoverMetaReviewGateFromSnapshot(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged.",
          now: new Date("2026-03-12T12:16:12.000Z")
        },
        {
          setMetaReviewerPaneBinding: setPaneSpy,
          appendProtocolEnvelope: appendWithInjectedFailure
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });

    expect(setPaneSpy).toHaveBeenCalled();
    expect(
      setPaneSpy.mock.calls.some(([args]) => args.active === false)
    ).toBe(true);
  });

  it("emits explicit unavoidable reason code when recovery throw-path pane deactivation cannot be confirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_deactivate_throw_unavoidable_01",
      task: "Recover deactivation unavoidable fallback"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:16:20.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    await writeCanonicalMetaReviewSnapshot({
      statePath: bubble.paths.statePath,
      recommendation: "approve",
      summary: "Approve recommendation.",
      updatedAt: "2026-03-12T12:16:21.000Z"
    });

    const setPaneWithDeactivateFailure = vi.fn(async ({
      bubbleId: targetBubbleId,
      active
    }: {
      bubbleId: string;
      active: boolean;
    }) => {
      if (!active) {
        throw new Error("simulated pane cleanup failure");
      }
      return buildBoundMetaReviewerPaneResult({
        bubbleId: targetBubbleId,
        repoPath,
        worktreePath: bubble.paths.worktreePath,
        active
      });
    });

    const appendWithInjectedFailure: typeof appendProtocolEnvelope = async (input) => {
      if (input.envelope.type === "APPROVAL_REQUEST") {
        throw new Error("simulated APPROVAL_REQUEST append failure");
      }
      return appendProtocolEnvelope(input);
    };

    let thrown: unknown;
    try {
      await recoverMetaReviewGateFromSnapshot(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged.",
          now: new Date("2026-03-12T12:16:22.000Z")
        },
        {
          setMetaReviewerPaneBinding: setPaneWithDeactivateFailure,
          appendProtocolEnvelope: appendWithInjectedFailure
        }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    });
    expect(String((thrown as Error).message)).toContain(
      "META_REVIEW_GATE_PANE_DEACTIVATION_UNAVOIDABLE"
    );
    expect(
      setPaneWithDeactivateFailure.mock.calls.some(([args]) => args.active === false)
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
