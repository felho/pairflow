import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ConvergedCommandError,
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace
} from "../../../src/v11/application/converged/convergedCommandOrchestration.js";
import { emitPassFromWorkspace } from "../../../src/v11/application/pass/passCommandOrchestration.js";
import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import type { BubbleCreateResult } from "../../../src/v11/application/create/createBubble.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import {
  appendProtocolEnvelope
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import type {
  PassProtocolEnvelopePayload
} from "../../../src/v11/shared/protocol/protocolEnvelopeContract.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/v11/domain/state/execution/executionContext.js";
import {
  readStateSnapshot,
  writeStateSnapshot as rawWriteStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { resolveReviewerTestEvidenceArtifactPath } from "../../../src/v11/shared/reviewer/testEvidence.js";
import { resolveSummaryVerifierConsistencyGateArtifactPath } from "../../../src/v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import { resolveDocContractGateArtifactPath } from "../../../src/v11/infrastructure/artifact/gates/docContractGateArtifacts.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";

const tempDirs: string[] = [];
const defaultWatchdogTimeoutMinutes = 60;

function resolveWatchdogTimeoutMinutes(
  rawState: unknown
): number {
  const state = toPersistedSnapshot(buildBubbleStateSnapshotVariant(rawState as PersistedBubbleStateSnapshot));
  const executionContext =
    state.state === "RUNNING"
      ? metaReviewExecutionContextToRunningContext(
          state.meta_review?.execution_context ?? null
        )
      : state.execution_context;
  if (executionContext === null || executionContext === undefined) {
    return defaultWatchdogTimeoutMinutes;
  }
  const startedAtMs = Date.parse(executionContext.started_at);
  const deadlineAtMs = Date.parse(executionContext.deadline_at);
  const deltaMinutes = (deadlineAtMs - startedAtMs) / 60_000;
  return Number.isFinite(deltaMinutes) && deltaMinutes > 0
    ? deltaMinutes
    : defaultWatchdogTimeoutMinutes;
}

function normalizeTestStateForWrite(
  rawState: unknown
): Parameters<typeof rawWriteStateSnapshot>[1] {
  const state = toPersistedSnapshot(buildBubbleStateSnapshotVariant(rawState as PersistedBubbleStateSnapshot));
  if (state.state === "RUNNING" && state.active_role === "meta_reviewer") {
    return buildBubbleStateSnapshotVariant({
      ...state,
      execution_context: metaReviewExecutionContextToRunningContext(
        state.meta_review?.execution_context ?? null
      )
    });
  }

  if (state.state === "RUNNING") {
    if (state.round === 0) {
      return buildBubbleStateSnapshotVariant({
        ...state,
        execution_context: null
      });
    }
    if (state.active_role !== null && state.active_since !== null) {
      return buildBubbleStateSnapshotVariant({
        ...state,
        execution_context: buildRunningExecutionContext({
          bubbleId: state.bubble_id,
          round: state.round,
          activeRole: state.active_role,
          startedAt: state.active_since,
          watchdogTimeoutMinutes: resolveWatchdogTimeoutMinutes(buildBubbleStateSnapshotVariant(state)),
          attempt: state.execution_context?.attempt ?? 1
        })
      });
    }
  }

  return buildBubbleStateSnapshotVariant({
    ...state,
    execution_context: null
  });
}

async function writeStateSnapshot(
  statePath: Parameters<typeof rawWriteStateSnapshot>[0],
  state: unknown,
  options?: Parameters<typeof rawWriteStateSnapshot>[2]
): ReturnType<typeof rawWriteStateSnapshot> {
  return rawWriteStateSnapshot(
    statePath,
    normalizeTestStateForWrite(state),
    options
  );
}

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-converged-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupRunningBubbleWorkspaceLinkFixture(input: {
  repoPath: string;
  bubbleId: string;
  task: string;
  reviewArtifactType?: "code" | "document";
}): Promise<BubbleCreateResult> {
  const bubble = await createBubble({
    id: input.bubbleId,
    repoPath: input.repoPath,
    baseBranch: "main",
    reviewArtifactType: input.reviewArtifactType ?? "code",
    task: input.task,
    cwd: input.repoPath
  });
  await mkdir(join(bubble.paths.worktreePath, ".."), { recursive: true });
  await symlink(input.repoPath, bubble.paths.worktreePath);

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const startedAt = "2026-02-21T12:00:00.000Z";
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 1,
      active_agent: bubble.config.agents.implementer,
      active_role: "implementer",
      execution_context: buildRunningExecutionContext({
        bubbleId: bubble.bubbleId,
        round: 1,
        activeRole: "implementer",
        startedAt,
        watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
      }),
      active_since: startedAt,
      last_command_at: startedAt,
      round_role_history: [
        {
          round: 1,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: startedAt
        }
      ]
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function setupConvergedCandidateBubble(
  repoPath: string,
  bubbleId: string,
  options?: {
    reviewArtifactType?: "code" | "document";
  }
) {
  const bubble = await setupRunningBubbleWorkspaceLinkFixture({
    repoPath,
    bubbleId,
    task: "Implement + review",
    ...(options?.reviewArtifactType !== undefined
      ? { reviewArtifactType: options.reviewArtifactType }
      : {})
  });

  const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
  const passEvents: Array<{
    now: string;
    sender: "codex" | "claude";
    recipient: "codex" | "claude";
    round: number;
    payload: PassProtocolEnvelopePayload;
  }> = [
    {
      now: "2026-02-22T09:01:00.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 1,
      payload: {
        summary: "Implementation pass 1",
        pass_intent: "task"
      }
    },
    {
      now: "2026-02-22T09:02:00.000Z",
      sender: bubble.config.agents.reviewer,
      recipient: bubble.config.agents.implementer,
      round: 1,
      payload: {
        summary: "Review pass 1 clean",
        pass_intent: "review",
        findings_claim_state: "clean",
        findings_claim_source: "payload_flags",
        findings: []
      }
    },
    {
      now: "2026-02-22T09:03:00.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 2,
      payload: {
        summary: "Implementation pass 2",
        pass_intent: "task"
      }
    },
    {
      now: "2026-02-22T09:03:10.000Z",
      sender: bubble.config.agents.reviewer,
      recipient: bubble.config.agents.implementer,
      round: 2,
      payload: {
        summary: "Review pass 2 findings",
        pass_intent: "fix_request",
        findings_claim_state: "open_findings",
        findings_claim_source: "payload_flags",
        findings: [
          {
            severity: "P2",
            title: "Round-2 non-blocking follow-up"
          }
        ]
      }
    },
    {
      now: "2026-02-22T09:03:20.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 3,
      payload: {
        summary: "Implementation pass 3",
        pass_intent: "task"
      }
    },
    {
      now: "2026-02-22T09:03:30.000Z",
      sender: bubble.config.agents.reviewer,
      recipient: bubble.config.agents.implementer,
      round: 3,
      payload: {
        summary: "Review pass 3 clean",
        pass_intent: "review",
        findings_claim_state: "clean",
        findings_claim_source: "payload_flags",
        findings: []
      }
    },
    {
      now: "2026-02-22T09:03:40.000Z",
      sender: bubble.config.agents.implementer,
      recipient: bubble.config.agents.reviewer,
      round: 4,
      payload: {
        summary: "Implementation pass 4",
        pass_intent: "task"
      }
    }
  ];

  for (const event of passEvents) {
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date(event.now),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: event.sender,
        recipient: event.recipient,
        type: "PASS",
        round: event.round,
        payload: event.payload,
        refs: []
      }
    });
  }

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 4,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer",
      active_since: "2026-02-22T09:03:40.000Z",
      last_command_at: "2026-02-22T09:03:40.000Z",
      round_role_history: [
        {
          round: 1,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:01:00.000Z"
        },
        {
          round: 2,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:03:00.000Z"
        },
        {
          round: 3,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:03:20.000Z"
        },
        {
          round: 4,
          implementer: bubble.config.agents.implementer,
          reviewer: bubble.config.agents.reviewer,
          switched_at: "2026-02-22T09:03:40.000Z"
        }
      ]
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );

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

    expect(result.state.state).toBe("RUNNING");
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

    expect(result.state.state).toBe("RUNNING");
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

    expect(result.state.state).toBe("RUNNING");
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

    expect(result.state.state).toBe("RUNNING");
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
          summary: "Round 4 converged before approval rework",
          advisory_findings_open_total: 0
        },
        refs: []
      }
    });

    const result = await emitConvergedFromWorkspace({
      summary: "Round 5 reconvergence after requested rework",
      cwd: bubble.paths.worktreePath
    });
    expect(result.state.state).toBe("RUNNING");
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
    expect(result.state.state).toBe("RUNNING");
  });

  it("keeps non-document convergence blocking semantics unchanged after reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_scope_non_doc_01",
      task: "Scope compatibility",
      reviewArtifactType: "code"
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
    expect(result.state.state).toBe("RUNNING");
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
    expect(result.state.state).toBe("RUNNING");
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
    expect(result.state.state).toBe("RUNNING");
  });
});
