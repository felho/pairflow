import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  emitConvergedFromWorkspace,
  ConvergedCommandError,
  resolveMetaReviewRolloutBlockingReasonCodes
} from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { readTranscriptEnvelopes, appendProtocolEnvelope } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { resolveReviewerTestEvidenceArtifactPath } from "../../../src/core/reviewer/testEvidence.js";
import { resolveSummaryVerifierConsistencyGateArtifactPath } from "../../../src/core/reviewer/summaryVerifierConsistencyGate.js";
import { resolveDocContractGateArtifactPath } from "../../../src/core/gates/docContractGates.js";
import { initGitRepository } from "../../helpers/git.js";
import {
  setupRunningBubbleFixture,
  setupRunningLegacyAutoBubbleFixture
} from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-converged-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupConvergedCandidateBubble(
  repoPath: string,
  bubbleId: string,
  options?: {
    reviewArtifactType?: "auto" | "document";
  }
) {
  const bubble = options?.reviewArtifactType === "auto"
    ? await setupRunningLegacyAutoBubbleFixture({
      repoPath,
      bubbleId,
      task: "Implement + review"
    })
    : await setupRunningBubbleFixture({
      repoPath,
      bubbleId,
      task: "Implement + review",
      ...(options?.reviewArtifactType !== undefined
        ? { reviewArtifactType: options.reviewArtifactType }
        : {})
    });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:03:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 2 findings",
    findings: [
      {
        severity: "P2",
        title: "Round-2 non-blocking follow-up"
      }
    ],
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:03:10.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 3",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:03:20.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 3 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:03:30.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 4",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:03:40.000Z")
  });

  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitConvergedFromWorkspace", () => {
  it("adds PAIRFLOW_COMMAND_PATH_STALE blocking reason only for self_host stale status", () => {
    const externalCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        localEntrypointExists: false,
        externalPairflowAvailable: true,
        pinnedCommand: "pairflow",
        message: "external profile active"
      }
    });
    expect(externalCodes).not.toContain("PAIRFLOW_COMMAND_PATH_STALE");

    const selfHostCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "stale",
        reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "stale"
      }
    });
    expect(selfHostCodes).toContain("PAIRFLOW_COMMAND_PATH_STALE");

    const externalUnavailableCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "pairflow",
        message: "external unavailable"
      }
    });
    expect(externalUnavailableCodes).toContain(
      "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    );

    const guardedExternalUnavailableCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "synthetic invalid combo"
      }
    });
    expect(guardedExternalUnavailableCodes).not.toContain(
      "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    );

    const selfHostUnresolvedCodes = resolveMetaReviewRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "unknown",
        reasonCode: "PAIRFLOW_COMMAND_PATH_UNRESOLVED",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "self_host unresolved"
      }
    });
    expect(selfHostUnresolvedCodes).toContain("PAIRFLOW_COMMAND_PATH_UNRESOLVED");
  });

  it("emits approval wait notifications to human + implementer + reviewer panes", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_01");
    const deliveries: Array<{
      recipient: string;
      messageRef?: string;
    }> = [];

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Ready for approval.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          deliveries.push({
            recipient: input.envelope.recipient,
            ...(input.messageRef !== undefined
              ? { messageRef: input.messageRef }
              : {})
          });
          return Promise.resolve({
            delivered: true,
            sessionName: "pf-b_converged_notify_01",
            message: "ok"
          });
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "converged",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(deliveries.map((delivery) => delivery.recipient)).toEqual([
      "human",
      "codex",
      "claude"
    ]);
    const expectedRef = `${bubble.paths.transcriptPath}#${result.approvalRequestEnvelope.id}`;
    expect(deliveries.map((delivery) => delivery.messageRef)).toEqual([
      expectedRef,
      expectedRef,
      expectedRef
    ]);
    expect(deliveries[0]?.messageRef?.startsWith("transcript.ndjson#")).toBe(false);
    expect(result.delivery).toEqual({
      delivered: true,
      retried: false
    });
  });

  it("emits auto-rework delivery only to implementer pane", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_03");
    const deliveries: string[] = [];
    const loaded = await readStateSnapshot(bubble.paths.statePath);

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Auto rework route.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:30.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: async () => ({
          bubbleId: bubble.bubbleId,
          route: "auto_rework",
          gateSequence: 999,
          gateEnvelope: {
            id: "msg_auto_rework_01",
            ts: "2026-02-22T09:04:30.000Z",
            bubble_id: bubble.bubbleId,
            sender: "orchestrator",
            recipient: bubble.config.agents.implementer,
            type: "APPROVAL_DECISION",
            round: loaded.state.round,
            payload: {
              decision: "revise",
              message: "Implement auto-rework patch.",
              metadata: {
                actor: "meta-review-gate"
              }
            },
            refs: []
          },
          state: {
            ...loaded.state,
            state: "RUNNING",
            round: loaded.state.round + 1,
            active_agent: bubble.config.agents.implementer,
            active_role: "implementer",
            active_since: "2026-02-22T09:04:30.000Z",
            last_command_at: "2026-02-22T09:04:30.000Z"
          }
        }),
        emitTmuxDeliveryNotification: (input) => {
          deliveries.push(input.envelope.recipient);
          return Promise.resolve({
            delivered: true,
            sessionName: "pf-b_converged_notify_03",
            message: "ok"
          });
        }
      }
    );

    expect(deliveries).toEqual([bubble.config.agents.implementer]);
    expect(result.gateRoute).toBe("auto_rework");
    expect(result.delivery).toEqual({
      delivered: true,
      retried: false
    });
  });

  it("returns deterministic delivery status when any approval notification is unconfirmed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_notify_02");

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Ready for approval.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          if (input.envelope.recipient === bubble.config.agents.implementer) {
            return Promise.resolve({
              delivered: false,
              sessionName: "pf-b_converged_notify_02",
              message: "not confirmed",
              reason: "delivery_unconfirmed"
            });
          }
          return Promise.resolve({
            delivered: true,
            sessionName: "pf-b_converged_notify_02",
            message: "ok"
          });
        }
      }
    );

    expect(result.gateRoute).toBe("human_gate_run_failed");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.delivery).toEqual({
      delivered: false,
      reason: "delivery_unconfirmed",
      retried: false
    });
  });

  it("recovers from gate-routing failure by replaying route from META_REVIEW_RUNNING snapshot", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_recover_01");

    const result = await emitConvergedFromWorkspace(
      {
        summary: "Recover from partial gate failure.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:45.000Z")
      },
      {
        applyMetaReviewGateOnConvergence: async () => {
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
                last_autonomous_run_id: "run_converged_recover_01",
                last_autonomous_status: "success",
                last_autonomous_recommendation: "approve",
                last_autonomous_summary: "Recovered summary from snapshot.",
                last_autonomous_report_ref: "artifacts/meta-review-last.md",
                last_autonomous_rework_target_message: null,
                last_autonomous_updated_at: "2026-02-22T09:04:45.000Z",
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
          throw new Error("simulated gate crash after snapshot write");
        }
      }
    );

    expect(result.gateRoute).toBe("human_gate_approve");
    expect(result.approvalRequestEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");

    const finalState = await readStateSnapshot(bubble.paths.statePath);
    expect(finalState.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
  });

  it("writes CONVERGENCE + APPROVAL_REQUEST and moves RUNNING -> READY_FOR_APPROVAL when meta-review run fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_01");
    const now = new Date("2026-02-22T09:05:00.000Z");

    const result = await emitConvergedFromWorkspace({
      summary: "Two clean review passes, ready for approval.",
      refs: ["artifact://done-package.md"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.bubbleId).toBe("b_converged_01");
    expect(result.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.gateRoute).toBe("human_gate_run_failed");
    expect(result.approvalRequestEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.approvalRequestEnvelope.recipient).toBe("human");
    expect(result.state.state).toBe("META_REVIEW_FAILED");
    expect(result.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "APPROVAL_REQUEST"
    ]);

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.map((entry) => entry.type)).toEqual(["APPROVAL_REQUEST"]);
  });

  it("blocks docs-only convergence when summary has runtime claims and verifier is untrusted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(
      repoPath,
      "b_converged_docs_gate_01",
      {
        reviewArtifactType: "document"
      }
    );

    await rm(resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir), {
      force: true
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "tests pass, typecheck clean, lint clean.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:04:00.000Z")
      })
    ).rejects.toThrow(/summary\/verifier consistency gate blocked approval summary/u);

    const gateArtifactPath = resolveSummaryVerifierConsistencyGateArtifactPath(
      bubble.paths.artifactsDir
    );
    const gateArtifactRaw = await readFile(gateArtifactPath, "utf8");
    const gateArtifact = JSON.parse(gateArtifactRaw) as {
      gate_decision: string;
      reason_code: string;
      review_artifact_type: string;
      verifier_status: string;
      claim_classes_detected: string;
      matched_claim_triggers: string[];
      verifier_origin_reason?: string;
    };

    expect(gateArtifact.gate_decision).toBe("block");
    expect(gateArtifact.reason_code).toBe("summary_verifier_mismatch");
    expect(gateArtifact.review_artifact_type).toBe("document");
    expect(gateArtifact.verifier_status).toBe("untrusted");
    expect(gateArtifact.claim_classes_detected).toBe("test,typecheck,lint");
    expect(gateArtifact.matched_claim_triggers).toEqual([
      "tests pass",
      "typecheck clean",
      "lint clean"
    ]);
    expect(gateArtifact.verifier_origin_reason).toBe("evidence_missing");
    expect(gateArtifact).not.toHaveProperty("reason_detail");
  });

  it("allows docs-only convergence with claim-free summary even when verifier is untrusted", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(
      repoPath,
      "b_converged_docs_gate_02",
      {
        reviewArtifactType: "document"
      }
    );

    await rm(resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir), {
      force: true
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Runtime checks not required for docs-only scope.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:04:00.000Z")
    });

    expect(result.state.state).toBe("META_REVIEW_FAILED");
    const gateArtifactPath = resolveSummaryVerifierConsistencyGateArtifactPath(
      bubble.paths.artifactsDir
    );
    const gateArtifactRaw = await readFile(gateArtifactPath, "utf8");
    const gateArtifact = JSON.parse(gateArtifactRaw) as {
      gate_decision: string;
      reason_code: string;
      verifier_status: string;
      claim_classes_detected: string;
      matched_claim_triggers: string[];
    };

    expect(gateArtifact.gate_decision).toBe("allow");
    expect(gateArtifact.reason_code).toBe("no_claim_in_docs_only");
    expect(gateArtifact.verifier_status).toBe("untrusted");
    expect(gateArtifact.claim_classes_detected).toBe("none");
    expect(gateArtifact.matched_claim_triggers).toEqual([]);
    expect(gateArtifact).not.toHaveProperty("verifier_origin_reason");
  });

  it("keeps non-docs convergence as not_applicable even with runtime-claim summary", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_docs_gate_03");

    await rm(resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir), {
      force: true
    });

    const result = await emitConvergedFromWorkspace({
      summary: "tests pass and typecheck clean.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:04:00.000Z")
    });

    expect(result.state.state).toBe("META_REVIEW_FAILED");
    const gateArtifactPath = resolveSummaryVerifierConsistencyGateArtifactPath(
      bubble.paths.artifactsDir
    );
    const gateArtifactRaw = await readFile(gateArtifactPath, "utf8");
    const gateArtifact = JSON.parse(gateArtifactRaw) as {
      gate_decision: string;
      reason_code: string;
      review_artifact_type: string;
      claim_classes_detected: string;
      matched_claim_triggers: string[];
    };

    expect(gateArtifact.gate_decision).toBe("not_applicable");
    expect(gateArtifact.reason_code).toBe("not_applicable_non_docs");
    expect(gateArtifact.review_artifact_type).toBe("code");
    expect(gateArtifact.claim_classes_detected).toBe("none");
    expect(gateArtifact.matched_claim_triggers).toEqual([]);
    expect(gateArtifact).not.toHaveProperty("verifier_origin_reason");
  });

  it("does not fail-close convergence in advisory mode when persisted spec lock state is stale LOCKED", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(
      repoPath,
      "b_converged_spec_lock_advisory_01",
      {
        reviewArtifactType: "document"
      }
    );
    const gateArtifactPath = resolveDocContractGateArtifactPath(bubble.paths.artifactsDir);
    await writeFile(
      gateArtifactPath,
      JSON.stringify(
        {
          schema_version: 1,
          updated_at: "2026-03-05T12:45:00.000Z",
          task_warnings: [],
          config_warnings: [],
          review_warnings: [],
          finding_evaluations: [],
          round_gate_state: {
            applies: false,
            violated: false,
            round: 2
          },
          spec_lock_state: {
            state: "LOCKED",
            open_blocker_count: 0,
            open_required_now_count: 1
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await emitConvergedFromWorkspace({
      summary: "Converge despite stale lock in advisory mode.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:04:00.000Z")
    });

    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("records auditable metadata when doc-gate artifact is unreadable during docs-scope convergence", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(
      repoPath,
      "b_converged_doc_gate_read_warning_01",
      {
        reviewArtifactType: "document"
      }
    );
    await writeFile(
      resolveDocContractGateArtifactPath(bubble.paths.artifactsDir),
      "{invalid-json",
      "utf8"
    );
    const metricsRoot = await mkdtemp(join(tmpdir(), "pairflow-converged-metrics-"));
    tempDirs.push(metricsRoot);
    const previousMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;

    try {
      await emitConvergedFromWorkspace({
        summary: "Docs-only convergence with unreadable gate artifact.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T09:06:00.000Z")
      });

      const shardRaw = await readFile(
        join(metricsRoot, "2026", "02", "events-2026-02.ndjson"),
        "utf8"
      );
      const events = shardRaw
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as {
          event_type: string;
          metadata: {
            doc_gate_artifact_read_failed?: boolean;
            doc_gate_artifact_read_failure_reason?: string;
          };
        });
      const convergedEvent = [...events]
        .reverse()
        .find((event) => event.event_type === "bubble_converged");

      expect(convergedEvent?.metadata.doc_gate_artifact_read_failed).toBe(true);
      expect(convergedEvent?.metadata.doc_gate_artifact_read_failure_reason).toContain(
        "Invalid JSON in doc contract gate artifact"
      );
    } finally {
      if (previousMetricsRoot === undefined) {
        delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
      } else {
        process.env.PAIRFLOW_METRICS_EVENTS_ROOT = previousMetricsRoot;
      }
    }
  });

  it("blocks convergence in accuracy-critical bubbles when latest review verification is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_acc_01",
      task: "Implement + review",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:01:00.000Z")
    });
    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await emitPassFromWorkspace({
      summary: "Review pass 1 clean",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:02:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementation pass 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });
    await rm(bubble.paths.reviewVerificationArtifactPath, { force: true });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/accuracy-critical review verification must be pass \(current: missing\)/u);
  });

  it("allows convergence in accuracy-critical bubbles when latest review verification is pass", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_acc_02",
      task: "Implement + review",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:01:00.000Z")
    });
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await emitPassFromWorkspace({
      summary: "Review pass 1 clean",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:02:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementation pass 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Ready for approval.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:04:00.000Z")
    });

    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("blocks convergence in accuracy-critical bubbles when latest review verification artifact is from a stale round", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_acc_02_stale",
      task: "Implement + review",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:01:00.000Z")
    });
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await emitPassFromWorkspace({
      summary: "Review pass 1 clean",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:02:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementation pass 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });
    await writeFile(
      bubble.paths.reviewVerificationArtifactPath,
      `${JSON.stringify(
        {
          schema: "review_verification_v1",
          overall: "pass",
          claims: [
            {
              claim_id: "C1",
              status: "verified",
              evidence_refs: ["src/a.ts:1"]
            }
          ],
          input_ref: "review-verification-input.json",
          meta: {
            bubble_id: bubble.bubbleId,
            round: 1,
            reviewer: bubble.config.agents.reviewer,
            generated_at: "2026-02-22T09:03:30.000Z"
          },
          validation: {
            status: "valid",
            errors: []
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail because artifact is stale for round 2",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/accuracy-critical review verification must be pass \(current: invalid\)/u);
  });

  it("blocks convergence in accuracy-critical bubbles when latest review verification is fail", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_acc_03",
      task: "Implement + review",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:01:00.000Z")
    });
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "fail",
        claims: [
          {
            claim_id: "C1",
            status: "mismatch",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await emitPassFromWorkspace({
      summary: "Review found mismatch",
      findings: [
        {
          severity: "P3",
          title: "Mismatch"
        }
      ],
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:02:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementation pass 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/accuracy-critical review verification must be pass \(current: fail\)/u);
  });

  it("blocks convergence in accuracy-critical bubbles when latest review verification artifact is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_acc_04",
      task: "Implement + review",
      accuracyCritical: true,
      reviewerBrief: "Require verification input."
    });

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:01:00.000Z")
    });
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/a.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await emitPassFromWorkspace({
      summary: "Review clean",
      noFindings: true,
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:02:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementation pass 2",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });
    await writeFile(bubble.paths.reviewVerificationArtifactPath, "{invalid", "utf8");

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/accuracy-critical review verification must be pass \(current: invalid\)/u);
  });

  it("rejects when active role is not reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_02",
      task: "Implement"
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(ConvergedCommandError);
  });

  it("rejects when expected state fingerprint does not match current state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(
      repoPath,
      "b_converged_expected_fingerprint_01"
    );

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail due to stale expected fingerprint",
        cwd: bubble.paths.worktreePath,
        expectedStateFingerprint: "stale-fingerprint"
      })
    ).rejects.toThrow(/AUTO_CONVERGE_STATE_STALE/u);
  });

  it("returns explicit round-1 convergence guardrail reason code", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_round1_guardrail_01",
      task: "Round-1 convergence guardrail"
    });

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T10:01:00.000Z")
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Attempt converge in round 1",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/ROUND1_CONVERGENCE_GUARDRAIL/u);
  });

  it("rejects when convergence alternation evidence is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_03",
      task: "Implement"
    });

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T10:01:00.000Z")
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/alternation evidence/u);
  });

  it("rejects with explicit reason when previous reviewer PASS is missing at round>1", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_missing_previous_reviewer_pass_01",
      task: "Convergence previous reviewer PASS requirement"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T10:40:00.000Z",
        last_command_at: "2026-02-22T10:40:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:10:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:20:00.000Z"
          },
          {
            round: 3,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:30:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:21:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 2,
        payload: {
          summary: "Implementation pass in previous round"
        },
        refs: []
      }
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail: previous reviewer PASS is missing",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING/u);
  });

  it("accepts prior-round reviewer CONVERGENCE as qualifying reviewer verdict", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_previous_convergence_01",
      task: "Convergence after approval rework"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 5,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T10:50:00.000Z",
        last_command_at: "2026-02-22T10:50:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:10:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:20:00.000Z"
          },
          {
            round: 3,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:30:00.000Z"
          },
          {
            round: 4,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:40:00.000Z"
          },
          {
            round: 5,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:50:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:41:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: "orchestrator",
        type: "CONVERGENCE",
        round: 4,
        payload: {
          summary: "Round 4 converged before approval rework"
        },
        refs: []
      }
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Round 5 reconvergence after requested rework",
      cwd: bubble.paths.worktreePath
    });
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("rejects when unresolved human question exists in transcript", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_04");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T10:05:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "claude",
        recipient: "human",
        type: "HUMAN_QUESTION",
        round: 2,
        payload: {
          question: "Need approval detail"
        },
        refs: []
      }
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/unresolved HUMAN_QUESTION/u);
  });

  it("rejects when previous reviewer PASS has open P0/P1 findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_05",
      task: "Implement"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 2,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T11:00:00.000Z",
        last_command_at: "2026-02-22T11:00:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:50:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:55:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:51:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation pass"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:52:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Review found blocker",
          findings: [
            {
              severity: "P1",
              title: "Data race risk",
              timing: "required-now",
              layer: "L1",
              refs: ["artifact://review/data-race-proof.md"]
            }
          ]
        },
        refs: []
      }
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/open P0\/P1 findings/u);
  });

  it("allows post-gate converged when previous reviewer PASS had blocking findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_post_gate_01",
      task: "Implement"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T11:20:00.000Z",
        last_command_at: "2026-02-22T11:20:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:50:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:55:00.000Z"
          },
          {
            round: 3,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:00:00.000Z"
          },
          {
            round: 4,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:05:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T11:01:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 3,
        payload: {
          summary: "Implementation pass"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T11:02:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 3,
        payload: {
          summary: "Review found blocker in round 3",
          findings: [
            {
              severity: "P1",
              title: "Blocking defect fixed in round 4"
            }
          ]
        },
        refs: []
      }
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Round 4 converged after blocker fix",
      cwd: bubble.paths.worktreePath
    });
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("keeps non-document convergence blocking semantics unchanged after reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningLegacyAutoBubbleFixture({
      repoPath,
      bubbleId: "b_converged_scope_non_doc_01",
      task: "Scope compatibility"
    });

    await emitPassFromWorkspace({
      summary: "Implementation handoff",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T11:21:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Reviewer found blocking issue",
      findings: [
        {
          priority: "P1",
          effective_priority: "P2",
          timing: "required-now",
          layer: "L1",
          title: "Non-doc blocker without evidence should stay blocking"
        }
      ],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T11:22:00.000Z")
    });
    await emitPassFromWorkspace({
      summary: "Implementation follow-up",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T11:23:00.000Z")
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should still block in non-doc scope",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-22T11:24:00.000Z")
      })
    ).rejects.toThrow(/open P0\/P1 findings/u);
  });

  it("allows in round 3 when previous reviewer PASS has only P2 findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_06",
      task: "Implement"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 3,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T11:10:00.000Z",
        last_command_at: "2026-02-22T11:10:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:50:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:55:00.000Z"
          },
          {
            round: 3,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:00:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:58:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 2,
        payload: {
          summary: "Implementation pass"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:59:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 2,
        payload: {
          summary: "Review found non-blocking but significant issue",
          findings: [
            {
              severity: "P2",
              title: "Timeout edge case not fully covered"
            }
          ]
        },
        refs: []
      }
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Round 3 convergence with non-blocking findings",
      cwd: bubble.paths.worktreePath
    });
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("allows in round 2 when previous reviewer PASS has only P2 findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_07",
      task: "Implement"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 2,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T11:20:00.000Z",
        last_command_at: "2026-02-22T11:20:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:10:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:15:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T11:11:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation pass"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T11:12:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Review found non-blocking but meaningful issue",
          findings: [
            {
              severity: "P2",
              title: "Retry path lacks explicit assertion"
            }
          ]
        },
        refs: []
      }
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Round 2 convergence with non-blocking findings",
      cwd: bubble.paths.worktreePath
    });
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });

  it("supports converged integration with non-default severity_gate_round config", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_non_default_gate_01",
      task: "Converged non-default gate integration"
    });

    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        severity_gate_round: 8
      }),
      "utf8"
    );

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 4,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T11:30:00.000Z",
        last_command_at: "2026-02-22T11:30:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:15:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:20:00.000Z"
          },
          {
            round: 3,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:25:00.000Z"
          },
          {
            round: 4,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T11:30:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T11:26:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 3,
        payload: {
          summary: "Implementation pass"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T11:27:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 3,
        payload: {
          summary: "Review found non-blocking follow-up",
          findings: [
            {
              severity: "P2",
              title: "Non-blocking issue remains"
            }
          ]
        },
        refs: []
      }
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Converged with non-default gate config",
      cwd: bubble.paths.worktreePath
    });
    expect(result.state.state).toBe("META_REVIEW_FAILED");
  });
});
