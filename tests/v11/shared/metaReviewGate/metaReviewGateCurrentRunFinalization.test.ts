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
      sticky_human_gate: false
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
            meta_review_auto_rework_min_severity: "P2"
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
            meta_review_auto_rework_min_severity: "P2"
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
            meta_review_auto_rework_min_severity: "P2"
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
            meta_review_auto_rework_min_severity: "P3"
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
      sticky_human_gate: true
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
            meta_review_auto_rework_min_severity: "P3"
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
            meta_review_auto_rework_min_severity: "P2"
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
        if (readCount > 1) {
          throw new Error("simulated second-read failure");
        }
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
            meta_review_auto_rework_min_severity: "P2"
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
