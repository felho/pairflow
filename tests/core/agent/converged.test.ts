import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace, ConvergedCommandError } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { readTranscriptEnvelopes, appendProtocolEnvelope } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { resolveReviewerTestEvidenceArtifactPath } from "../../../src/core/reviewer/testEvidence.js";
import { resolveSummaryVerifierConsistencyGateArtifactPath } from "../../../src/core/reviewer/summaryVerifierConsistencyGate.js";
import { resolveDocContractGateArtifactPath } from "../../../src/core/gates/docContractGates.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

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
  const bubble = await setupRunningBubbleFixture({
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
  });

  it("writes CONVERGENCE + APPROVAL_REQUEST and moves RUNNING -> READY_FOR_APPROVAL", async () => {
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
    expect(result.approvalRequestEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.approvalRequestEnvelope.recipient).toBe("human");
    expect(result.state.state).toBe("READY_FOR_APPROVAL");
    expect(result.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
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
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_docs_gate_01",
      task: "Docs only round",
      reviewArtifactType: "document"
    });

    await emitPassFromWorkspace({
      summary: "Documentation update handoff.",
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
      summary: "Documentation update handoff 2.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });

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
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_docs_gate_02",
      task: "Docs only round",
      reviewArtifactType: "document"
    });

    await emitPassFromWorkspace({
      summary: "Documentation update handoff.",
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
      summary: "Documentation update handoff 2.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:03:00.000Z")
    });

    await rm(resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir), {
      force: true
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Runtime checks not required for docs-only scope.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:04:00.000Z")
    });

    expect(result.state.state).toBe("READY_FOR_APPROVAL");
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

    expect(result.state.state).toBe("READY_FOR_APPROVAL");
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
    expect(gateArtifact.review_artifact_type).toBe("auto");
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

    expect(result.state.state).toBe("READY_FOR_APPROVAL");
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

    expect(result.state.state).toBe("READY_FOR_APPROVAL");
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

  it("keeps non-document convergence blocking semantics unchanged after reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_scope_non_doc_01",
      task: "Scope compatibility",
      reviewArtifactType: "auto"
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
    expect(result.state.state).toBe("READY_FOR_APPROVAL");
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
    expect(result.state.state).toBe("READY_FOR_APPROVAL");
  });
});
