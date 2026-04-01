import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile as writeFileFs } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import {
  buildMetaReviewSubmitCommandTemplate
} from "../../../src/core/runtime/metaReviewSubmitGuidance.js";
import { notifyMetaReviewerSubmissionRequest } from "../../../src/v11/shared/metaReviewGate/metaReviewGateNotify.js";
import {
  appendHumanApprovalRequestEnvelope
} from "../../../src/core/bubble/approvalRequestEnvelope.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
import { serializeEnvelopeLine } from "../../../src/core/protocol/envelope.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
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

async function runSuccessfulMetaReviewerRespawn() {
  return {
    stdout: "",
    stderr: "",
    exitCode: 0
  };
}

function defaultMetaReviewSnapshot(): BubbleMetaReviewSnapshotState {
  return {
    execution_context: null,
    runtime_delivery: null,
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
      runTmux: async () => runSuccessfulMetaReviewerRespawn(),
      notifyMetaReviewerSubmissionRequest: async () => ({
        status: "confirmed",
        reasonCode: null,
        message: "ok"
      })
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
        last_autonomous_report_ref: "artifacts/meta-review-last.json",
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
  const bubbleDir = dirname(input.statePath);
  const runId = `snapshot_${input.recommendation}_${Date.parse(input.updatedAt)}`;
  const defaultReportJson =
    input.recommendation === "approve"
      ? {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0,
          findings_claimed_open_total: 0,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 0
        }
      : input.recommendation === "rework"
        ? {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 1
          }
        : {
            findings_claim_state: "unknown",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0
          };
  await writeFileFs(
    join(bubbleDir, "artifacts", "meta-review-last.json"),
    `${JSON.stringify(
      {
        run_id: runId,
        recommendation: input.recommendation,
        summary: input.summary,
        report_ref: "artifacts/meta-review-last.json",
        report_json: defaultReportJson
      },
      null,
      2
    )}\n`,
    "utf8"
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

function buildApproveReportJson(input?: {
  claimedOpenTotal?: number;
  blockingOpenTotal?: number;
  advisoryOpenTotal?: number;
  artifactOpenTotal?: number;
}) {
  const claimedOpenTotal = input?.claimedOpenTotal ?? 0;
  const blockingOpenTotal = input?.blockingOpenTotal ?? 0;
  const advisoryOpenTotal = input?.advisoryOpenTotal ?? 0;
  const artifactOpenTotal = input?.artifactOpenTotal;
  return {
    findings_claim_state: claimedOpenTotal > 0 ? "open_findings" : "clean",
    findings_claim_source: "meta_review_artifact",
    findings_count: claimedOpenTotal,
    findings_claimed_open_total: claimedOpenTotal,
    findings_blocking_open_total: blockingOpenTotal,
    findings_advisory_open_total: advisoryOpenTotal,
    ...(artifactOpenTotal !== undefined
      ? { findings_artifact_open_total: artifactOpenTotal }
      : {})
  } as const;
}

describe("notifyMetaReviewerSubmissionRequest", () => {
  it("sends required structured submit command with --report-json parity fields", async () => {
    const tmuxCalls: string[][] = [];
    let captureCount = 0;
    const result = await notifyMetaReviewerSubmissionRequest(
      {
        bubbleId: "b_meta_gate_notify_01",
        round: 4,
        targetPane: "pf_meta_structured:0.3"
      },
      {
        runTmux: async (args) => {
          tmuxCalls.push(args);
          if (args[0] === "capture-pane") {
            captureCount += 1;
            return {
              stdout:
                captureCount >= 2
                  ? "# [pairflow] bubble=b_meta_gate_notify_01 meta-review request round=4."
                  : "trusted pane",
              stderr: "",
              exitCode: 0
            };
          }
          return {
            stdout: "",
            stderr: "",
            exitCode: 0
          };
        }
      }
    );
    expect(result).toEqual({
      status: "confirmed",
      reasonCode: null,
      message: "meta-review submit request delivery confirmed from pane scrollback."
    });

    const messageCall = tmuxCalls.find(
      (args) =>
        args[0] === "send-keys" &&
        args[2] === "pf_meta_structured:0.3" &&
        args[3] === "-l"
    );
    expect(messageCall?.[4]).toContain("Required command (include --report-json parity fields):");
    expect(messageCall?.[4]).toContain(
      buildMetaReviewSubmitCommandTemplate({
        bubbleId: "b_meta_gate_notify_01",
        round: 4
      })
    );
    expect(messageCall?.[4]).toContain("--report-json");
    expect(messageCall?.[4]).toContain("findings_claim_state");
    expect(messageCall?.[4]).toContain("findings_claim_source");
    expect(messageCall?.[4]).toContain("findings_count");
    expect(messageCall?.[4]).toContain("findings_claimed_open_total");
    expect(messageCall?.[4]).toContain("findings_blocking_open_total");
    expect(messageCall?.[4]).toContain("findings_advisory_open_total");
    expect(messageCall?.[4]).not.toContain("--report-markdown");
  });

  it("accepts a request marker that already scrolled out of the visible viewport", async () => {
    const tmuxCalls: string[][] = [];
    const result = await notifyMetaReviewerSubmissionRequest(
      {
        bubbleId: "b_meta_gate_notify_history_01",
        round: 4,
        targetPane: "pf_meta_structured:0.3"
      },
      {
        runTmux: async (args) => {
          tmuxCalls.push(args);
          if (args[0] === "capture-pane") {
            const capturesScrollback =
              args.includes("-S") && args.includes("-");
            return {
              stdout: capturesScrollback
                ? [
                    "# [pairflow] bubble=b_meta_gate_notify_history_01 meta-review request round=4.",
                    "",
                    "Thinking through the review..."
                  ].join("\n")
                : "Thinking through the review...",
              stderr: "",
              exitCode: 0
            };
          }
          return {
            stdout: "",
            stderr: "",
            exitCode: 0
          };
        }
      }
    );
    expect(result.status).toBe("confirmed");

    const captureCall = tmuxCalls.find(
      (args) => args[0] === "capture-pane" && args.includes("-S")
    );
    expect(captureCall).toEqual([
      "capture-pane",
      "-p",
      "-t",
      "pf_meta_structured:0.3",
      "-S",
      "-"
    ]);
  });

  it("fails fast when the meta-reviewer pane already fell back to interactive shell", async () => {
    await expect(
      notifyMetaReviewerSubmissionRequest(
        {
          bubbleId: "b_meta_gate_notify_exit_01",
          round: 2,
          targetPane: "pf_meta_structured:0.3"
        },
        {
          runTmux: async (args) => {
            if (args[0] === "capture-pane") {
              return {
                stdout: [
                  "codex exited (code 0). Dropping to interactive shell.",
                  "bash-3.2$"
                ].join("\n"),
                stderr: "",
                exitCode: 0
              };
            }
            return {
              stdout: "",
              stderr: "",
              exitCode: 0
            };
          }
        }
      )
    ).resolves.toMatchObject({
      status: "failed",
      reasonCode: "META_REVIEWER_PANE_EXITED"
    });
  });
});

describe("applyMetaReviewGateOnConvergence", () => {
  it("starts async meta-review and emits TASK kickoff when pane is available", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_01",
      task: "Async gate start"
    });
    const notifySpy = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "ok"
    }));

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
        runTmux: async () => runSuccessfulMetaReviewerRespawn(),
        notifyMetaReviewerSubmissionRequest: notifySpy
      }
    );

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.gateEnvelope.payload.summary).toContain(
      buildMetaReviewSubmitCommandTemplate({
        bubbleId: bubble.bubbleId,
        round: result.state.round
      })
    );
    expect(result.gateEnvelope.payload.summary).toContain("--report-json");
    expect(result.gateEnvelope.payload.summary).toContain("findings_claim_state");
    expect(result.gateEnvelope.payload.summary).toContain("findings_claim_source");
    expect(result.gateEnvelope.payload.summary).toContain("findings_count");
    expect(result.gateEnvelope.payload.summary).toContain("findings_claimed_open_total");
    expect(result.gateEnvelope.payload.summary).toContain("findings_blocking_open_total");
    expect(result.gateEnvelope.payload.summary).toContain("findings_advisory_open_total");
    expect(result.gateEnvelope.payload.summary).not.toContain("[--report-json");
    expect(result.gateEnvelope.payload.summary).not.toContain("--report-markdown");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "meta_reviewer"
    });
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.active_role).toBe("meta_reviewer");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "confirmed",
      reason_code: null,
      message: "ok"
    });
    expect(notifySpy).toHaveBeenCalledTimes(1);

    const persisted = await readStateSnapshot(bubble.paths.statePath);
    expect(persisted.state.state).toBe("META_REVIEW_RUNNING");
    expect(persisted.state.meta_review?.runtime_delivery).toMatchObject({
      status: "confirmed",
      reason_code: null,
      message: "ok"
    });
  });

  it("respawns the meta-reviewer pane before sending the submission request", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_respawn_01",
      task: "Async gate respawn"
    });
    const tmuxCalls: string[][] = [];
    const notifySpy = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "ok"
    }));

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:00:30.000Z")
      },
      {
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        notifyMetaReviewerSubmissionRequest: notifySpy,
        runTmux: async (args) => {
          tmuxCalls.push(args);
          return runSuccessfulMetaReviewerRespawn();
        }
      }
    );

    expect(result.route).toBe("meta_review_running");
    expect(notifySpy).toHaveBeenCalledTimes(1);
    const respawnCall = tmuxCalls.find((args) => args[0] === "respawn-pane");
    expect(respawnCall).toBeDefined();
    expect(respawnCall?.[3]).toBe("pf_meta_structured:0.3");
    expect(respawnCall?.at(-1)).toContain("Pairflow meta-reviewer start");
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

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEWER_PANE_UNAVAILABLE"
    });
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
        runTmux: async () => runSuccessfulMetaReviewerRespawn(),
        notifyMetaReviewerSubmissionRequest: async () => ({
          status: "failed",
          reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "tmux send failed"
        })
      }
    );

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED"
    });
    expect(setPaneCalls).toEqual([true, false]);
  });

  it("tolerates runtime delivery persistence CAS conflicts without suppressing the durable handoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_runtime_conflict_01",
      task: "Async gate runtime delivery persistence conflict"
    });

    const writeStateWithInjectedConflict: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      if (
        options?.expectedState === "META_REVIEW_RUNNING" &&
        state.state === "META_REVIEW_RUNNING" &&
        state.meta_review?.runtime_delivery !== null
      ) {
        throw new StateStoreConflictError("simulated runtime delivery CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:02:15.000Z")
      },
      {
        writeStateSnapshot: writeStateWithInjectedConflict,
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        runTmux: async () => runSuccessfulMetaReviewerRespawn(),
        notifyMetaReviewerSubmissionRequest: async () => ({
          status: "uncertain",
          reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
          message: "pane delivery not confirmed"
        })
      }
    );

    expect(result.route).toBe("meta_review_running");
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.state.meta_review?.runtime_delivery).toBeNull();

    const persisted = await readStateSnapshot(bubble.paths.statePath);
    expect(persisted.state.state).toBe("META_REVIEW_RUNNING");
    expect(persisted.state.meta_review?.runtime_delivery).toBeNull();
  });

  it("returns the newer persisted lifecycle state when runtime delivery persistence loses a CAS race to a progressed writer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_runtime_progressed_01",
      task: "Async gate runtime delivery persistence progressed race"
    });

    let injected = false;
    const writeStateWithProgressedRace: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      if (
        !injected &&
        options?.expectedState === "META_REVIEW_RUNNING" &&
        state.state === "META_REVIEW_RUNNING" &&
        state.meta_review?.runtime_delivery !== null
      ) {
        injected = true;
        const latest = await readStateSnapshot(statePath);
        const progressed = applyStateTransition(latest.state, {
          to: "READY_FOR_HUMAN_APPROVAL",
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: "2026-03-12T12:02:16.000Z"
        });
        await writeStateSnapshot(statePath, progressed, {
          expectedFingerprint: latest.fingerprint,
          expectedState: "META_REVIEW_RUNNING"
        });
        await appendHumanApprovalRequestEnvelope({
          transcriptPath: bubble.paths.transcriptPath,
          inboxPath: bubble.paths.inboxPath,
          lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
          now: new Date("2026-03-12T12:02:16.500Z"),
          bubbleId: bubble.bubbleId,
          round: latest.state.round,
          summary: "Converged. Meta-review result needs human confirmation.",
          route: "human_gate_inconclusive",
          refs: []
        });
        throw new StateStoreConflictError("simulated runtime delivery CAS conflict");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    const result = await applyMetaReviewGateOnConvergence(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged for meta-review.",
        now: new Date("2026-03-12T12:02:15.000Z")
      },
      {
        writeStateSnapshot: writeStateWithProgressedRace,
        setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) =>
          buildBoundMetaReviewerPaneResult({
            bubbleId: targetBubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            active
          }),
        runTmux: async () => runSuccessfulMetaReviewerRespawn(),
        notifyMetaReviewerSubmissionRequest: async () => ({
          status: "uncertain",
          reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
          message: "pane delivery not confirmed"
        })
      }
    );

    expect(result.route).toBe("human_gate_inconclusive");
    expect(result.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      meta_review_gate_route: "human_gate_inconclusive"
    });

    const persisted = await readStateSnapshot(bubble.paths.statePath);
    expect(persisted.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
  });

  it("deactivates the meta-review pane when runtime delivery persistence fails after durable kickoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_async_start_runtime_write_failure_01",
      task: "Async gate runtime delivery persistence write failure"
    });
    const setPaneCalls: boolean[] = [];

    const writeStateWithInjectedFailure: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      if (
        options?.expectedState === "META_REVIEW_RUNNING" &&
        state.state === "META_REVIEW_RUNNING" &&
        state.meta_review?.runtime_delivery !== null
      ) {
        throw new Error("simulated runtime delivery persistence failure");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    await expect(
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged for meta-review.",
          now: new Date("2026-03-12T12:02:18.000Z")
        },
        {
          writeStateSnapshot: writeStateWithInjectedFailure,
          setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => {
            setPaneCalls.push(active);
            return buildBoundMetaReviewerPaneResult({
              bubbleId: targetBubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath,
              active
            });
          },
          runTmux: async () => runSuccessfulMetaReviewerRespawn(),
          notifyMetaReviewerSubmissionRequest: async () => ({
            status: "confirmed",
            reasonCode: null,
            message: "ok"
          })
        }
      )
    ).rejects.toThrow("simulated runtime delivery persistence failure");

    expect(setPaneCalls).toEqual([true, false]);
  });

  it("does not touch pane binding when TASK append fails before durable handoff", async () => {
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
        runTmux: async () => runSuccessfulMetaReviewerRespawn(),
        notifyMetaReviewerSubmissionRequest: async () => ({
          status: "confirmed",
          reasonCode: null,
          message: "ok"
        }),
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
    expect(setPaneCalls).toEqual([]);
  });

  it("requires a fresh meta-review run when legacy sticky state leaks into a later round", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_round_local_01",
      task: "Round-local freshness"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        round: 4,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true,
          last_autonomous_run_id: "run_prev_round",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Previous round approve.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
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
          run_id: "run_prev_round",
          round: 3,
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Later-round convergence should rerun meta-review.",
      now: new Date("2026-03-12T12:03:10.000Z")
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.state.state).toBe("META_REVIEW_RUNNING");
    expect(result.gateEnvelope.type).toBe("TASK");

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.meta_review).toMatchObject({
      sticky_human_gate: false,
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_updated_at: null
    });
  });

  it("does not route convergence findings directly to human approval from sticky carry-over", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_round_local_02",
      task: "Round-local findings freshness"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        round: 5,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true,
          last_autonomous_run_id: "run_prev_round_findings",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Previous round approve with advisories.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_updated_at: "2026-03-13T12:03:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "R5 convergence summary with advisory follow-ups.",
      now: new Date("2026-03-13T12:03:12.000Z")
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.gateEnvelope.type).toBe("TASK");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.some((entry) => entry.type === "APPROVAL_REQUEST")).toBe(false);
  });

  it("keeps cleared live meta-review state when META_REVIEW_RUNNING staging fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_round_local_restore_01",
      task: "Round-local restore semantics"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        meta_review: {
          ...(loaded.state.meta_review ?? defaultMetaReviewSnapshot()),
          sticky_human_gate: true,
          last_autonomous_run_id: "run_prev_round_restore",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Previous round snapshot.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_updated_at: "2026-03-13T12:03:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const stageFailureWriteState: typeof writeStateSnapshot = async (
      statePath,
      state,
      options
    ) => {
      if (
        options?.expectedState === "READY_FOR_APPROVAL" &&
        state.state === "META_REVIEW_RUNNING"
      ) {
        throw new StateStoreConflictError("simulated meta-review-running stage failure");
      }
      return writeStateSnapshot(statePath, state, options);
    };

    await expect(
      applyMetaReviewGateOnConvergence(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          summary: "Converged with round-local restore guard.",
          now: new Date("2026-03-13T12:03:12.000Z")
        },
        {
          writeStateSnapshot: stageFailureWriteState
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    });

    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.state).toBe("RUNNING");
    expect(after.state.meta_review).toMatchObject({
      sticky_human_gate: false,
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_updated_at: null
    });
  });
});

describe("recoverMetaReviewGateFromSnapshot", () => {
  it("keeps META_REVIEW_RUNNING during recover when no durable result exists before deadline", async () => {
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
    expect(recovered.route).toBe("meta_review_running");
    expect(recovered.state.state).toBe("META_REVIEW_RUNNING");
    expect(recovered.state.meta_review?.execution_context).not.toBeNull();
    await expect(
      readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects before-deadline recovery when only a generic TASK remains and the meta-review kickoff envelope is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_missing_kickoff_01",
      task: "Recover should not reuse generic TASK as meta-review kickoff"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:09:00.000Z")
    });
    expect(started.route).toBe("meta_review_running");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath, {
      allowMissing: false
    });
    const withoutMetaReviewKickoff = transcript.filter(
      (envelope) => envelope.payload.metadata?.actor !== "meta-review-gate"
    );
    await writeFileFs(
      bubble.paths.transcriptPath,
      withoutMetaReviewKickoff.map((envelope) => serializeEnvelopeLine(envelope)).join(""),
      "utf8"
    );

    await expect(
      recoverMetaReviewGateFromSnapshot({
        bubbleId: bubble.bubbleId,
        repoPath,
        summary: "Converged.",
        now: new Date("2026-03-12T12:09:02.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
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
    await writeFileFs(
      bubble.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(
        {
          bubble_id: bubble.bubbleId,
          run_id: "run_recover_approve_01",
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
      last_autonomous_report_ref: "artifacts/meta-review-last.json",
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
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 0,
          findings_artifact_status: "available",
          findings_digest_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          meta_review_run_id: "run_recover_approve_parity_metadata_01",
          findings_parity_status: "ok",
          findings: []
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 0,
      findings_artifact_open_total: 0,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 0,
      findings_artifact_status: "available",
      findings_digest_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      meta_review_run_id: "run_recover_approve_parity_metadata_01",
      findings_parity_status: "ok"
    });
    expect(recovered.gateEnvelope.payload.findings).toBeUndefined();
  });

  it("fails closed when approve-route split metadata is unavailable", async () => {
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

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED"
    );
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
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_artifact_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2,
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

  it("fails closed with summary mismatch before metadata normalization when approve summary contradicts structured split", async () => {
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
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 0,
          findings_artifact_status: "available",
          findings_digest_sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          meta_review_run_id: "run_recover_approve_summary_inconsistent_01",
          findings_parity_status: "mismatch"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    );
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
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 0,
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
          report_ref: "artifacts/meta-review-last.json",
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
    expect(recovered.gateEnvelope.payload.decision).toBe("rework");

    const autoReworkReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const autoReworkReportJson = JSON.parse(autoReworkReportJsonRaw) as {
      summary: string;
      recommendation: string;
      status: string;
      report_ref: string;
    };
    expect(autoReworkReportJson).toMatchObject({
      summary: "Need one more rework.",
      recommendation: "rework",
      status: "success",
      report_ref: "artifacts/meta-review-last.json"
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
          report_ref: "artifacts/meta-review-last.json",
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
            report_ref: "artifacts/meta-review-last.json",
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
            report_ref: "artifacts/meta-review-last.json",
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
            report_ref: "artifacts/meta-review-last.json",
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
          report_ref: "artifacts/meta-review-last.json",
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
          report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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

  it("fails closed when approve recommendation is missing required advisory split fields", async () => {
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
        report_ref: "artifacts/meta-review-last.json",
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
      "META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED"
    );
  });

  it("routes advisory-only approve when split metadata is valid and blocking total is zero", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_advisory_only_01",
      task: "Recover approve advisory-only split route"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:49.500Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "2 findings remain open, all advisory.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:50.500Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_advisory_only_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:50.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2,
          findings_artifact_open_total: 2,
          findings_artifact_status: "available",
          findings_digest_sha256:
            "abababababababababababababababababababababababababababababababab",
          meta_review_run_id: "run_recover_approve_advisory_only_01",
          findings_parity_status: "ok"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "META_REVIEW_GATE_APPROVAL_SUMMARY_NORMALIZED"
    );
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "CONVERGED_ADVISORY_COUNT_LIST_MISMATCH"
    );
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: 2,
      findings_parity_status: "ok"
    });
    expect(
      recovered.gateEnvelope.payload.metadata?.approval_summary_normalization_reason_code
    ).toBeUndefined();
  });

  it("routes advisory-only approve when findings_artifact_open_total is absent and keeps parity status unset", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_advisory_no_artifact_total_01",
      task: "Recover approve advisory split route without artifact-open total"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:50.700Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "2 advisory findings remain open.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:51.700Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_advisory_no_artifact_total_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:51.100Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2,
          findings_artifact_status: "available",
          findings_digest_sha256:
            "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
          meta_review_run_id: "run_recover_approve_advisory_no_artifact_total_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: null,
      findings_parity_status: null
    });
  });

  it("routes advisory-only approve when findings_artifact_open_total is explicit null and keeps parity status unset", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_advisory_null_artifact_total_01",
      task: "Recover approve advisory split route with null artifact-open total"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:51.900Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "2 advisory findings remain open.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:52.900Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_advisory_null_artifact_total_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:52.300Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2,
          findings_artifact_open_total: null,
          findings_artifact_status: "available",
          findings_digest_sha256:
            "efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef",
          meta_review_run_id: "run_recover_approve_advisory_null_artifact_total_01"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(recovered.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: null,
      findings_parity_status: null
    });
  });

  it("routes advisory-only approve when runResult summary is null", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_advisory_null_summary_01",
      task: "Recover approve advisory split route with null summary"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:52.200Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:53.200Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_advisory_null_summary_01",
        status: "success",
        recommendation: "approve",
        summary: null,
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:52.700Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toContain("Converged.");
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    );
  });

  it("fails closed when approve split indicates blocking open findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_blocking_present_01",
      task: "Recover approve blocking split rejection"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:51.000Z")
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
        run_id: "run_recover_approve_blocking_present_01",
        status: "success",
        recommendation: "approve",
        summary: "Blocking findings remain open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:51.500Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 1,
          findings_advisory_open_total: 0
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT"
    );
  });

  it("fails closed with parity guard when approve split arithmetic is inconsistent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_split_arithmetic_01",
      task: "Recover approve split arithmetic mismatch"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:52.100Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:53.100Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_split_arithmetic_01",
        status: "success",
        recommendation: "approve",
        summary: "Advisory findings remain open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:52.700Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
  });

  it("fails closed with parity guard when findings_artifact_open_total mismatches approve claimed total", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_artifact_invariant_01",
      task: "Recover approve artifact-open invariant mismatch"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:53.150Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.150Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_artifact_invariant_01",
        status: "success",
        recommendation: "approve",
        summary: "Advisory findings remain open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:53.650Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1,
          findings_artifact_open_total: 2
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
  });

  it("fails closed with summary/structured mismatch before approve semantic gate", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_summary_structured_mismatch_01",
      task: "Recover approve summary/structured mismatch precedence"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:53.200Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.200Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_summary_structured_mismatch_01",
        status: "success",
        recommendation: "approve",
        summary: "No findings remain after this review.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:53.700Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    );
  });

  it("does not fail advisory-only approve when summary only asserts no P0/P1 findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_no_blocking_summary_01",
      task: "Recover approve no-blocking summary with advisory-open split"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.250Z")
    });
    expect(started.route).toBe("meta_review_running");

    const summary = "No open P0/P1 findings remain.";
    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.250Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_no_blocking_summary_01",
        status: "success",
        recommendation: "approve",
        summary,
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:54.750Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2
        }
      }
    });

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.gateEnvelope.payload.summary).toBe(summary);
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    );
  });

  it("fails closed with split format guard when approve split fields are non-integer/negative", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_split_format_01",
      task: "Recover approve split format guard precedence"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:54.300Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.300Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_split_format_01",
        status: "success",
        recommendation: "approve",
        summary: "Advisory findings remain open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:54.800Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: "1",
          findings_blocking_open_total: -1,
          findings_advisory_open_total: 2
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID"
    );
  });

  it("fails closed with blocking reason precedence when artifact open total is invalid and blocking findings are present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_blocking_precedence_01",
      task: "Recover approve blocking precedence over artifact format guard"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:55.350Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:56.350Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_blocking_precedence_01",
        status: "success",
        recommendation: "approve",
        summary: "Blocking finding remains open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:55.850Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 1,
          findings_advisory_open_total: 0,
          findings_artifact_open_total: "invalid"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT"
    );
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
  });

  it("fails closed with parity guard when findings_artifact_open_total is non-integer on approve route", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_artifact_format_01",
      task: "Recover approve artifact-open format guard coverage"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:56.400Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:57.400Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_artifact_format_01",
        status: "success",
        recommendation: "approve",
        summary: "Advisory finding remains open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:56.900Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1,
          findings_artifact_open_total: "invalid"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_FINDINGS_PARITY_GUARD"
    );
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "findings_artifact_open_total must be a non-negative integer when provided"
    );
  });

  it("fails closed with split arithmetic reason when split arithmetic and artifact format errors are both present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_split_precedes_artifact_format_01",
      task: "Recover approve split arithmetic precedence over artifact format guard"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:57.450Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:58.450Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_split_precedes_artifact_format_01",
        status: "success",
        recommendation: "approve",
        summary: "Advisory findings remain open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:57.950Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1,
          findings_artifact_open_total: "invalid"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "findings_claimed_open_total (2) must equal findings_blocking_open_total + findings_advisory_open_total (1)"
    );
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "findings_artifact_open_total must be a non-negative integer when provided"
    );
  });

  it("fails closed with claim-state contradiction reason when claim-state contradiction and artifact format error are both present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_gate_recover_approve_claim_state_precedence_01",
      task: "Recover approve claim-state contradiction precedence over artifact format guard"
    });

    const started = await startAsyncMetaReviewGate({
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:57.800Z")
    });
    expect(started.route).toBe("meta_review_running");

    const recovered = await recoverMetaReviewGateFromSnapshot({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Converged.",
      now: new Date("2026-03-12T12:12:58.800Z"),
      runResult: {
        bubbleId: bubble.bubbleId,
        depth: "standard",
        run_id: "run_recover_approve_claim_state_precedence_01",
        status: "success",
        recommendation: "approve",
        summary: "Advisory findings remain open.",
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:12:58.300Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: {
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 1,
          findings_claimed_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1,
          findings_artifact_open_total: "invalid"
        }
      }
    });

    expect(recovered.route).toBe("human_gate_dispatch_failed");
    expect(recovered.gateEnvelope.payload.summary).toContain(
      "findings_claim_state=clean contradicts findings_claimed_open_total=1"
    );
    expect(recovered.gateEnvelope.payload.summary).not.toContain(
      "findings_artifact_open_total must be a non-negative integer when provided"
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
          report_ref: "artifacts/meta-review-last.json",
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
          report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
        report_ref: "artifacts/meta-review-last.json",
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
          report_ref: "artifacts/meta-review-last.json",
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

    const dispatchFailedReportJsonRaw = await readFile(
      bubble.paths.metaReviewLastJsonArtifactPath,
      "utf8"
    );
    const dispatchFailedReportJson = JSON.parse(dispatchFailedReportJsonRaw) as {
      summary: string;
      recommendation: string;
      status: string;
      report_ref: string;
    };
    expect(dispatchFailedReportJson).toMatchObject({
      summary: "Run result is missing rework message.",
      recommendation: "rework",
      status: "success",
      report_ref: "artifacts/meta-review-last.json"
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
          report_ref: "artifacts/meta-review-last.json",
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
      last_autonomous_report_ref: "artifacts/meta-review-last.json",
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
        warnings: [],
        report_json: buildApproveReportJson()
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

  it("surfaces canonical artifact write warning when recover JSON write fails", async () => {
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
          warnings: [],
          report_json: buildApproveReportJson()
        }
      },
      {
        writeFile: async (path, content, options) => {
          if (path === bubble.paths.metaReviewLastJsonArtifactPath) {
            throw new Error("simulated canonical json write failure");
          }
          await writeFileFs(path, content, options);
        }
      }
    );

    expect(recovered.route).toBe("human_gate_approve");
    expect(recovered.metaReviewRun?.warnings).toEqual([
      {
        reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
        message: "artifacts/meta-review-last.json: simulated canonical json write failure"
      }
    ]);
    expect(recovered.state.meta_review?.last_autonomous_report_ref).toBe(
      "artifacts/non-canonical.md"
    );
    await expect(
      readFile(bubble.paths.metaReviewLastJsonArtifactPath, "utf8")
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
          report_ref: "artifacts/meta-review-last.json",
          rework_target_message: null,
          updated_at: "2026-03-12T12:14:41.000Z",
          lifecycle_state: "META_REVIEW_RUNNING",
          warnings: [],
          report_json: buildApproveReportJson()
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
        "artifacts/meta-review-last.json: simulated recover artifact write failure"
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
        report_ref: "artifacts/meta-review-last.json",
        rework_target_message: null,
        updated_at: "2026-03-12T12:14:51.000Z",
        lifecycle_state: "META_REVIEW_RUNNING",
        warnings: [],
        report_json: buildApproveReportJson()
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
          report_ref: "artifacts/meta-review-last.json",
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
