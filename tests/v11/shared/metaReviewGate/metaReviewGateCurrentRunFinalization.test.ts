import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { finalizeCurrentRunMetaReviewGate } from "../../../../src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.js";
import type { MetaReviewResult } from "../../../../src/v11/shared/metaReview/metaReviewTypes.js";
import type { LoadedStateSnapshot } from "../../../../src/v11/shared/ports/stateSnapshots.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../../src/types/protocol.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

function createLoadedRunningState(): LoadedStateSnapshot {
  const state: BubbleStateSnapshot = {
    bubble_id: "b_meta_gate_finalize_threshold_01",
    state: "RUNNING",
    round: 1,
    active_agent: "codex",
    active_since: "2026-04-22T10:00:00.000Z",
    active_role: "meta_reviewer",
    execution_context: {
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      handoff_id: "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:1",
      execution_id: "exec_meta_gate_finalize_threshold_01",
      round: 1,
      started_at: "2026-04-22T10:00:00.000Z",
      deadline_at: "2026-04-22T10:30:00.000Z",
      attempt: 1
    },
    round_role_history: [
      {
        round: 1,
        implementer: "claude",
        reviewer: "codex",
        switched_at: "2026-04-22T10:00:00.000Z"
      }
    ],
    last_command_at: "2026-04-22T10:00:00.000Z",
    meta_review: {
      execution_context: {
        handoff_id: "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:1",
        execution_id: "exec_meta_gate_finalize_threshold_01",
        round: 1,
        awaited_output_type: "meta_review_result",
        started_at: "2026-04-22T10:00:00.000Z",
        deadline_at: "2026-04-22T10:30:00.000Z",
        attempt: 1
      },
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    }
  };

  return {
    fingerprint: "loaded-fingerprint",
    state
  };
}

async function createArtifactFixture(content: Record<string, unknown>): Promise<{
  bubbleDir: string;
  artifactsDir: string;
  artifactRef: string;
  digest: string;
}> {
  const bubbleDir = await mkdtemp(join(tmpdir(), "pairflow-meta-gate-finalize-"));
  tempDirs.push(bubbleDir);
  const artifactsDir = join(bubbleDir, "artifacts");
  await mkdir(artifactsDir, { recursive: true });
  const artifactRef = "artifacts/findings.json";
  const artifactPath = join(bubbleDir, artifactRef);
  await writeFile(artifactPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  const raw = await readFile(artifactPath, "utf8");

  return {
    bubbleDir,
    artifactsDir,
    artifactRef,
    digest: createHash("sha256").update(raw, "utf8").digest("hex")
  };
}

function createRunResult(input: {
  runId: string;
  artifactRef: string;
  digest: string;
  findingsCount: number;
  blockingOpenTotal?: number;
  advisoryOpenTotal?: number;
  recommendation?: "approve" | "rework";
}): MetaReviewResult {
  const recommendation = input.recommendation ?? "rework";
  return {
    bubble_id: "b_meta_gate_finalize_threshold_01",
    run_id: input.runId,
    recommendation,
    status: "success",
    summary: "Threshold-aware finalize fixture",
    rework_target_message:
      recommendation === "rework" ? "Fix the reported findings." : null,
    updated_at: "2026-04-22T10:05:00.000Z",
    warnings: [],
    report_json: {
      findings_claim_state: "open_findings",
      findings_claim_source: "meta_review_artifact",
      findings_count: input.findingsCount,
      findings_claimed_open_total: input.findingsCount,
      findings_blocking_open_total: input.blockingOpenTotal ?? input.findingsCount,
      findings_advisory_open_total: input.advisoryOpenTotal ?? 0,
      findings_artifact_ref: input.artifactRef,
      findings_artifact_status: "available",
      findings_digest_sha256: input.digest,
      meta_review_run_id: input.runId
    }
  };
}

function createCleanApproveRunResult(input: {
  runId: string;
  artifactOpenTotal?: number;
}): MetaReviewResult {
  return {
    bubble_id: "b_meta_gate_finalize_threshold_01",
    run_id: input.runId,
    recommendation: "approve",
    status: "success",
    summary: "Meta-review found no blocking or advisory findings.",
    rework_target_message: null,
    updated_at: "2026-04-22T10:05:00.000Z",
    warnings: [],
    report_json: {
      findings_claim_state: "clean",
      findings_claim_source: "meta_review_artifact",
      findings_count: 0,
      findings_claimed_open_total: 0,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 0,
      ...(input.artifactOpenTotal !== undefined
        ? { findings_artifact_open_total: input.artifactOpenTotal }
        : {}),
      meta_review_run_id: input.runId
    }
  };
}

function createAppendEnvelopeStub(): {
  envelopes: ProtocolEnvelope[];
  appendEnvelope: Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["appendEnvelope"];
} {
  const envelopes: ProtocolEnvelope[] = [];
  return {
    envelopes,
    appendEnvelope: async ({ envelope, now }) => {
      const envelopeNow = now ?? new Date("2026-04-22T10:05:00.000Z");
      const withId: ProtocolEnvelope = {
        ...envelope,
        id: `env_${String(envelopes.length + 1).padStart(2, "0")}`,
        ts: envelopeNow.toISOString()
      };
      envelopes.push(withId);
      return {
        envelope: withId,
        sequence: envelopes.length,
        mirrorWriteFailures: []
      };
    }
  };
}

function createWriteStateStub(): {
  writes: BubbleStateSnapshot[];
  writeState: Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["writeState"];
} {
  const writes: BubbleStateSnapshot[] = [];
  return {
    writes,
    writeState: async (_path, state) => {
      writes.push(state);
      return {
        fingerprint: `written-${writes.length}`,
        state
      };
    }
  };
}

describe("finalizeCurrentRunMetaReviewGate", () => {
  it("increments the clean streak and unlocks human approval when the requirement is one", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean approval fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_unlock_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_approve");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.auto_rework_count).toBe(0);
    expect(append.envelopes).toHaveLength(1);
  });

  it("starts another meta-review run when a clean approval is below the required streak", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_rerun_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_role).toBe("meta_reviewer");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.auto_rework_count).toBe(0);
    expect(result.state.meta_review?.execution_context).toMatchObject({
      handoff_id: "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2",
      attempt: 2
    });
  });

  it("treats a legacy missing clean streak as zero before clean-rerun routing", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    delete (loaded.state.meta_review as Partial<NonNullable<BubbleStateSnapshot["meta_review"]>>)
      .consecutive_clean_runs;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Legacy missing clean streak fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_legacy_missing_streak_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.auto_rework_count).toBe(0);
  });

  it("routes clean-rerun staging failure to dispatch-failed human gate with a reset streak", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const writes: BubbleStateSnapshot[] = [];
    let writeAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun stage failure fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_stage_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: async (_path, state) => {
        writeAttempt += 1;
        if (writeAttempt === 1) {
          throw new Error("simulated stage write failure");
        }
        writes.push(state);
        return {
          fingerprint: `written-${writes.length}`,
          state
        };
      }
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED: stage_error="
    );
  });

  it("keeps sticky human gate as a bypass for threshold-clean approve", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      sticky_human_gate: true,
      consecutive_clean_runs: 1
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Sticky clean approve fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_sticky_clean_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
  });

  it("unlocks human approval when the updated clean streak reaches the requirement", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      consecutive_clean_runs: 1
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean streak complete fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_unlock_02",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_approve");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(2);
  });

  it("resets a stale clean streak before auto-rework dispatch", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P1", title: "blocking" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      consecutive_clean_runs: 2
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Reset stale streak fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_reset_stale_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
  });

  it("does not attempt a post-append auto-rework hydration write", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P1", title: "blocking" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const writes: BubbleStateSnapshot[] = [];

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "No post-append hydration write fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_auto_rework_single_write_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: async (_path, state) => {
        if (writes.length > 0) {
          throw new Error("unexpected post-append state write");
        }
        writes.push(state);
        return {
          fingerprint: `written-${writes.length}`,
          state
        };
      }
    });

    expect(result.route).toBe("auto_rework");
    expect(append.envelopes).toHaveLength(1);
    expect(writes).toHaveLength(1);
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
  });

  it("resets a stale clean streak on a run-failed human gate", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      consecutive_clean_runs: 2
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Run failed reset stale streak fixture",
      runResult: {
        bubble_id: "b_meta_gate_finalize_threshold_01",
        run_id: "run_meta_gate_finalize_run_failed_reset_01",
        recommendation: "inconclusive",
        status: "error",
        summary: "Meta-review execution failed.",
        rework_target_message: null,
        updated_at: "2026-04-22T10:05:00.000Z",
        warnings: []
      },
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_run_failed");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
  });

  it("resets a stale clean streak on an inconclusive human gate", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      consecutive_clean_runs: 2
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Inconclusive reset stale streak fixture",
      runResult: {
        bubble_id: "b_meta_gate_finalize_threshold_01",
        run_id: "run_meta_gate_finalize_inconclusive_reset_01",
        recommendation: "inconclusive",
        status: "inconclusive",
        summary: "Meta-review could not make a conclusive recommendation.",
        rework_target_message: null,
        updated_at: "2026-04-22T10:05:00.000Z",
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_claimed_open_total: 0,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 0,
          meta_review_run_id: "run_meta_gate_finalize_inconclusive_reset_01"
        }
      },
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_inconclusive");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
  });

  it("resets a stale clean streak when auto-rework budget is exhausted", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P1", title: "blocking" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      auto_rework_count: 5,
      auto_rework_limit: 5,
      consecutive_clean_runs: 2
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Budget exhausted reset stale streak fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_budget_exhausted_reset_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_budget_exhausted");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.state.meta_review?.auto_rework_count).toBe(5);
  });

  it("fails closed and resets the clean streak when approve has inconsistent parity metadata", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      consecutive_clean_runs: 1
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Inconsistent clean authority fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_inconsistent_clean_01",
        artifactOpenTotal: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
  });

  it("resets the clean streak when clean rerun kickoff append fails", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const write = createWriteStateStub();
    const envelopes: ProtocolEnvelope[] = [];
    let appendAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 2
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun append failure fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_append_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: async ({ envelope, now }) => {
        appendAttempt += 1;
        if (appendAttempt === 1) {
          throw new Error("simulated kickoff append failure");
        }
        const withId: ProtocolEnvelope = {
          ...envelope,
          id: `env_${String(envelopes.length + 1).padStart(2, "0")}`,
          ts: (now ?? new Date("2026-04-22T10:05:00.000Z")).toISOString()
        };
        envelopes.push(withId);
        return {
          envelope: withId,
          sequence: envelopes.length,
          mirrorWriteFailures: []
        };
      },
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(write.writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_GATE_CLEAN_RERUN_DISPATCH_FAILED"
    );
  });

  it("dispatches auto rework only when the resolved threshold is met", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P1", title: "blocking" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Threshold met finalize fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_threshold_met_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.state.round).toBe(2);
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
    expect(append.envelopes).toHaveLength(1);
  });

  it("emits the configured meta-reviewer agent in auto-rework decision metadata", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P1", title: "blocking" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "claude"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Configured meta-reviewer auto-rework fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_meta_reviewer_agent_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "claude",
      recommendation: "rework"
    });
  });

  it("projects canonical findings into the auto-rework approval decision payload", async () => {
    const artifact = await createArtifactFixture({
      findings: [
        {
          priority: "P1",
          title: " blocking finding ",
          refs: [" docs/a.md ", "", 42]
        },
        {
          severity: "P3",
          title: "advisory finding",
          detail: "Needs follow-up",
          timing: "later-hardening",
          layer: "L1"
        },
        {
          severity: "blocking",
          title: "alias-only severity should not project"
        },
        {
          title: "missing severity and priority"
        }
      ],
      summary: { open_total: 4 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Canonical findings payload projection fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_payload_findings_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 4,
        blockingOpenTotal: 2,
        advisoryOpenTotal: 2
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.payload.findings).toEqual([
      {
        priority: "P1",
        severity: "P1",
        title: "blocking finding",
        refs: ["docs/a.md"]
      },
      {
        severity: "P3",
        title: "advisory finding",
        detail: "Needs follow-up",
        timing: "later-hardening",
        layer: "L1"
      }
    ]);
  });

  it("keeps auto-rework valid without payload findings when the artifact has no displayable entries", async () => {
    const artifact = await createArtifactFixture({
      findings: [
        {
          severity: "blocking",
          title: "alias-only severity should not project"
        },
        {
          title: "missing severity and priority"
        }
      ],
      summary: { open_total: 2 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "No displayable findings projection fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_payload_findings_missing_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 2,
        blockingOpenTotal: 2,
        advisoryOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.payload.findings).toBeUndefined();
  });

  it("does not threshold-gate the rework route when the highest open severity is below the configured minimum", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P3", title: "advisory" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Threshold not met finalize fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_threshold_not_met_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1,
        blockingOpenTotal: 0,
        advisoryOpenTotal: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.gateEnvelope.type).toBe("APPROVAL_DECISION");
    expect(result.state.round).toBe(2);
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
  });

  it("backstops threshold-met open-findings approve away from human_gate_approve", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P3", title: "advisory threshold finding" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P3",
            meta_review_auto_rework_min_severity: "P3",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Threshold-met approve backstop fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_approve_backstop_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1,
        blockingOpenTotal: 0,
        advisoryOpenTotal: 1,
        recommendation: "approve"
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.route).not.toBe("human_gate_approve");
    expect(result.state.meta_review?.auto_rework_count).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP"
    );
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_dispatch_failed",
      findings_claimed_open_total: 1,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 1,
      findings_artifact_open_total: 1,
      findings_parity_status: "ok"
    });
  });

  it("applies the threshold backstop before sticky human-gate bypass", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P3", title: "sticky advisory threshold finding" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      sticky_human_gate: true,
      consecutive_clean_runs: 0,
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P3",
            meta_review_auto_rework_min_severity: "P3",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Sticky threshold-met approve backstop fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_sticky_approve_backstop_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1,
        blockingOpenTotal: 0,
        advisoryOpenTotal: 1,
        recommendation: "approve"
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.route).not.toBe("human_gate_sticky_bypass");
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP"
    );
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_dispatch_failed"
    });
  });

  it("does not perform an extra threshold authority read for the rework route", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P1", title: "blocking" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    let readCount = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Threshold unresolved finalize fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_threshold_unresolved_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: async (path, encoding) => {
        readCount += 1;
        return readFile(path, encoding);
      },
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(readCount).toBe(1);
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
  });

  it("reuses threshold authority already resolved by the approve backstop", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ severity: "P3", title: "advisory" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    let readCount = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Advisory approve threshold reuse fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_advisory_approve_read_once_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1,
        blockingOpenTotal: 0,
        advisoryOpenTotal: 1,
        recommendation: "approve"
      }),
      readFileFn: async (path, encoding) => {
        readCount += 1;
        if (readCount > 1) {
          throw new Error("simulated second-read failure");
        }
        return readFile(path, encoding);
      },
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(readCount).toBe(1);
    expect(result.route).toBe("human_gate_approve");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(1);
  });

  it("does not require severity derivation for the rework route", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ title: "missing severity" }],
      summary: { open_total: 1 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "claude",
            reviewer: "codex",
            meta_reviewer: "codex"
          },
          review_policy: {
            review_loop_mode: "full",
            reviewer_blocking_min_severity: "P2",
            meta_review_auto_rework_min_severity: "P2",
            meta_review_consecutive_clean_runs_required: 1,
          }
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          statePath: join(artifact.bubbleDir, "state.json"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded: createLoadedRunningState(),
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Threshold incomplete finalize fixture",
      runResult: createRunResult({
        runId: "run_meta_gate_finalize_threshold_incomplete_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("auto_rework");
    expect(result.state.meta_review?.auto_rework_count).toBe(1);
    expect(result.state.meta_review?.sticky_human_gate).toBe(false);
  });
});
