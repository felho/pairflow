import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { finalizeCurrentRunMetaReviewGate } from "../../../../src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.js";
import {
  assertActiveMetaReviewExecutionContext,
  assertMetaReviewSubmitStaleGuard
} from "../../../../src/v11/shared/metaReview/metaReviewCommandSubmitAuthority.js";
import { MetaReviewError } from "../../../../src/v11/shared/metaReview/metaReviewError.js";
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
  recommendation?: "approve" | "rework" | "inconclusive";
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

function createAppendEnvelopeStub(events?: string[]): {
  envelopes: ProtocolEnvelope[];
  appendEnvelope: Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["appendEnvelope"];
} {
  const envelopes: ProtocolEnvelope[] = [];
  return {
    envelopes,
    appendEnvelope: async ({ envelope, now }) => {
      events?.push("kickoff_append");
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

function createWriteStateStub(events?: string[]): {
  writes: BubbleStateSnapshot[];
  writeState: Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["writeState"];
} {
  const writes: BubbleStateSnapshot[] = [];
  return {
    writes,
    writeState: async (_path, state) => {
      if (
        state.state === "RUNNING" &&
        state.active_role === "meta_reviewer" &&
        state.meta_review?.execution_context !== undefined &&
        state.meta_review.runtime_delivery === null
      ) {
        events?.push("state_stage");
      } else if (state.meta_review?.runtime_delivery !== undefined) {
        events?.push("delivery_observation_persist");
      }
      writes.push(state);
      return {
        fingerprint: `written-${writes.length}`,
        state
      };
    }
  };
}

function createCleanRerunDeliveryStubs(input: {
  envelopes: ProtocolEnvelope[];
  writes: BubbleStateSnapshot[];
  fallbackLoaded: LoadedStateSnapshot;
  events?: string[];
}): {
  paneBindingActiveCalls: boolean[];
  readState: NonNullable<
    Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["readState"]
  >;
  readTranscript: NonNullable<
    Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["readTranscript"]
  >;
  setMetaReviewerPane: NonNullable<
    Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["setMetaReviewerPane"]
  >;
  resolvePaneWarning: NonNullable<
    Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["resolvePaneWarning"]
  >;
} {
  const paneBindingActiveCalls: boolean[] = [];
  return {
    paneBindingActiveCalls,
    readState: async () => ({
      fingerprint: `written-${input.writes.length}`,
      state: input.writes.at(-1) ?? input.fallbackLoaded.state
    }),
    readTranscript: async () => input.envelopes,
    setMetaReviewerPane: async ({ active }) => {
      input.events?.push(`pane_active_${String(active)}`);
      paneBindingActiveCalls.push(active);
      return {
        updated: false as const,
        reason: "no_runtime_session" as const
      };
    },
    resolvePaneWarning: async () => {
      input.events?.push("pane_binding_notification");
      return {
        delivery: {
          status: "confirmed" as const,
          reasonCode: null,
          message: "meta-review rerun delivered"
        },
        shouldDeactivate: false
      };
    }
  };
}

async function createCleanFinalizeInputFixture(input?: {
  artifactContent?: Record<string, unknown>;
  commands?: Parameters<typeof finalizeCurrentRunMetaReviewGate>[0]["resolved"]["bubbleConfig"]["commands"];
  consecutiveCleanRunsRequired?: number;
  initialCleanRuns?: number;
  omitValidationRunner?: boolean;
  omitWorktreePath?: boolean;
  runnerErrorStage?: "pre_header" | "spawn" | "settle" | "stdout" | "stderr";
  runExitCodes?: Partial<Record<string, number>>;
  runExitCode?: number;
  runResultFactory?: (
    artifact: Awaited<ReturnType<typeof createArtifactFixture>>
  ) => MetaReviewResult;
  runResult?: MetaReviewResult;
  stickyHumanGate?: boolean;
  validationTarget?: Parameters<
    typeof finalizeCurrentRunMetaReviewGate
  >[0]["resolved"]["bubbleConfig"]["validation_target"];
}): Promise<{
  runValidationCalls: Array<{
    cwd?: string;
    kind: string;
    logPathPrefix?: string;
    targetId?: string;
    targetPaths?: string[];
  }>;
  finalizeInput: Parameters<typeof finalizeCurrentRunMetaReviewGate>[0];
}> {
  const artifact = await createArtifactFixture(
    input?.artifactContent ?? {
      findings: [],
      summary: { open_total: 0 }
    }
  );
  const append = createAppendEnvelopeStub();
  const write = createWriteStateStub();
  const loaded = createLoadedRunningState();
  if (input?.stickyHumanGate === true) {
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      sticky_human_gate: true,
      consecutive_clean_runs: input.initialCleanRuns ?? 1
    };
  } else if (input?.initialCleanRuns !== undefined) {
    loaded.state.meta_review = {
      ...loaded.state.meta_review!,
      consecutive_clean_runs: input.initialCleanRuns
    };
  }
  const delivery = createCleanRerunDeliveryStubs({
    envelopes: append.envelopes,
    writes: write.writes,
    fallbackLoaded: loaded
  });
  const runValidationCalls: Array<{
    cwd?: string;
    kind: string;
    logPathPrefix?: string;
    targetId?: string;
    targetPaths?: string[];
  }> = [];

  return {
    runValidationCalls,
    finalizeInput: {
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
            meta_review_consecutive_clean_runs_required:
              input?.consecutiveCleanRunsRequired ?? 1
          },
          ...(input?.validationTarget !== undefined
            ? { validation_target: input.validationTarget }
            : {}),
          ...(input?.commands !== undefined ? { commands: input.commands } : {})
        },
        bubblePaths: {
          bubbleDir: artifact.bubbleDir,
          artifactsDir: artifact.artifactsDir,
          inboxPath: join(artifact.bubbleDir, "inbox.ndjson"),
          locksDir: join(artifact.bubbleDir, "locks"),
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson"),
          ...(input?.omitWorktreePath === true
            ? {}
            : { worktreePath: artifact.bubbleDir })
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean approval fixture",
      runResult:
        input?.runResultFactory?.(artifact) ??
        input?.runResult ??
        createCleanApproveRunResult({
          runId: "run_meta_gate_finalize_clean_validation_fixture",
          artifactOpenTotal: 0
        }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning,
      ...(input?.omitValidationRunner === true
        ? {}
        : {
            runMetaReviewApproveValidationCommand: async (command) => {
              if (input?.runnerErrorStage !== undefined) {
                const error = new Error(
                  `simulated ${input.runnerErrorStage} failure`
                );
                Object.assign(error, {
                  stage: input.runnerErrorStage,
                  logPath:
                    `.pairflow/evidence/${command.evidence?.logPathPrefix}-${command.kind}-fixture.log`
                });
                throw error;
              }
              runValidationCalls.push({
                kind: command.kind,
                ...(command.cwd !== undefined ? { cwd: command.cwd } : {}),
                ...(command.evidence?.logPathPrefix !== undefined
                  ? { logPathPrefix: command.evidence.logPathPrefix }
                  : {}),
                ...(command.targetId !== undefined
                  ? { targetId: command.targetId }
                  : {}),
                ...(command.targetPaths !== undefined
                  ? { targetPaths: [...command.targetPaths] }
                  : {})
              });
              return {
                command: command.command,
                exitCode:
                  input?.runExitCodes?.[command.kind] ?? input?.runExitCode ?? 0,
                logPath:
                  `.pairflow/evidence/${command.evidence?.logPathPrefix}-${command.kind}-fixture.log`,
                durationMs: 1,
                executionCwd: command.worktreePath
              };
            }
          })
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
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean approval fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_unlock_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
    });

    expect(result.route).toBe("human_gate_approve");
    expect(result.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.auto_rework_count).toBe(0);
    expect(append.envelopes).toHaveLength(1);
  });

  it("runs configured meta-review approve validation before human approval", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_approve");
    expect(fixture.runValidationCalls).toEqual([
      {
        kind: "test",
        logPathPrefix: "meta-review-approve-validation"
      }
    ]);
  });

  it("passes validation target metadata to the approve validation runner", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test:web",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      validationTarget: {
        id: "web",
        cwd: "apps/web",
        paths: ["apps/web/**", "packages/ui/**"]
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_approve");
    expect(fixture.runValidationCalls).toEqual([
      {
        cwd: "apps/web",
        kind: "test",
        logPathPrefix: "meta-review-approve-validation",
        targetId: "web",
        targetPaths: ["apps/web/**", "packages/ui/**"]
      }
    ]);
  });

  it("blocks human approval when configured meta-review approve validation fails", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      initialCleanRuns: 2,
      runExitCode: 1
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(fixture.runValidationCalls).toHaveLength(1);
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_VALIDATION_FAILED"
    );
    expect(result.gateEnvelope.payload.summary).toContain("stage=exec");
    expect(result.gateEnvelope.payload.summary).toContain("commandId=test");
    expect(result.gateEnvelope.payload.summary).toContain("exitCode=1");
    expect(result.gateEnvelope.payload.summary).toContain(
      "logPath=.pairflow/evidence/meta-review-approve-validation-test-fixture.log"
    );
  });

  it("maps approve validation runner settle failures to exec diagnostics", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      runnerErrorStage: "settle"
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.gateEnvelope.payload.summary).toContain("stage=exec");
    expect(result.gateEnvelope.payload.summary).toContain("runnerStage=settle");
  });

  it.each([
    ["pre_header", "log"],
    ["spawn", "spawn"],
    ["stdout", "log"],
    ["stderr", "log"]
  ] as const)(
    "maps approve validation runner %s failures to %s diagnostics",
    async (runnerErrorStage, expectedStage) => {
      const fixture = await createCleanFinalizeInputFixture({
        commands: {
          test: "pnpm test",
          typecheck: "pnpm typecheck",
          meta_review_approve_required: ["test"]
        },
        runnerErrorStage
      });

      const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

      expect(result.route).toBe("human_gate_dispatch_failed");
      expect(result.gateEnvelope.payload.summary).toContain(
        `stage=${expectedStage}`
      );
      expect(result.gateEnvelope.payload.summary).toContain(
        `runnerStage=${runnerErrorStage}`
      );
      if (runnerErrorStage === "pre_header") {
        expect(result.gateEnvelope.payload.summary).toContain("logPath=null");
      }
    }
  );

  it("attributes multi-command approve validation failure to the failing command", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["typecheck", "test"]
      },
      runExitCodes: {
        typecheck: 0,
        test: 1
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(fixture.runValidationCalls).toEqual([
      {
        kind: "typecheck",
        logPathPrefix: "meta-review-approve-validation"
      },
      {
        kind: "test",
        logPathPrefix: "meta-review-approve-validation"
      }
    ]);
    expect(result.gateEnvelope.payload.summary).toContain("commandId=test");
    expect(result.gateEnvelope.payload.summary).toContain("exitCode=1");
    expect(result.gateEnvelope.payload.summary).toContain(
      "logPath=.pairflow/evidence/meta-review-approve-validation-test-fixture.log"
    );
  });

  it("uses spawn diagnostics when approve validation cannot access the worktree path", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      omitWorktreePath: true
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(fixture.runValidationCalls).toEqual([]);
    expect(result.gateEnvelope.payload.summary).toContain("stage=spawn");
    expect(result.gateEnvelope.payload.summary).toContain("commandId=test");
    expect(result.gateEnvelope.payload.summary).toContain("exitCode=null");
    expect(result.gateEnvelope.payload.summary).toContain("logPath=null");
  });

  it("uses spawn diagnostics when the approve validation runner is unavailable", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      omitValidationRunner: true
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(fixture.runValidationCalls).toEqual([]);
    expect(result.gateEnvelope.payload.summary).toContain("stage=spawn");
    expect(result.gateEnvelope.payload.summary).toContain("commandId=test");
    expect(result.gateEnvelope.payload.summary).toContain(
      "approve-gate validation runner is unavailable"
    );
  });

  it("uses precise diagnostics when approve validation references a non-string command value", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: true,
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      } as unknown as Parameters<
        typeof finalizeCurrentRunMetaReviewGate
      >[0]["resolved"]["bubbleConfig"]["commands"]
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(fixture.runValidationCalls).toEqual([]);
    expect(result.gateEnvelope.payload.summary).toContain("stage=resolve");
    expect(result.gateEnvelope.payload.summary).toContain("commandId=test");
    expect(result.gateEnvelope.payload.summary).toContain(
      "commands.test must be a string"
    );
  });

  it("preserves legacy human approval when approve validation policy is absent", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_approve");
    expect(fixture.runValidationCalls).toEqual([]);
  });

  it("preserves explicit empty approve validation as no-op before human approval", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: []
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_approve");
    expect(fixture.runValidationCalls).toEqual([]);
  });

  it("does not run approve validation before the clean-rerun threshold is met", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      consecutiveCleanRunsRequired: 2,
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("meta_review_running");
    expect(fixture.runValidationCalls).toEqual([]);
  });

  it("does not run approve validation for an inconclusive human gate", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      runResult: {
        bubble_id: "b_meta_gate_finalize_threshold_01",
        run_id: "run_meta_gate_finalize_inconclusive_validation_skip_01",
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
          meta_review_run_id:
            "run_meta_gate_finalize_inconclusive_validation_skip_01"
        }
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_inconclusive");
    expect(fixture.runValidationCalls).toEqual([]);
  });

  it("starts another meta-review run when a clean approval is below the required streak", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const events: string[] = [];
    const append = createAppendEnvelopeStub(events);
    const write = createWriteStateStub(events);
    const loaded = createLoadedRunningState();
    const previousExecutionContext = loaded.state.execution_context;
    if (previousExecutionContext === undefined || previousExecutionContext === null) {
      throw new Error("Expected previous execution context fixture.");
    }
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded,
      events
    });

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_rerun_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning,
      observeGateResultReconciled: () => {
        events.push("observed_result_reconcile");
      }
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
    expect(result.state.meta_review?.execution_context?.execution_id).not.toBe(
      previousExecutionContext.execution_id
    );
    expect(result.state.execution_context?.handoff_id).not.toBe(
      previousExecutionContext.handoff_id
    );
    expect(result.state.execution_context?.execution_id).not.toBe(
      previousExecutionContext.execution_id
    );
    expect(result.state.execution_context).toMatchObject({
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      handoff_id: result.state.meta_review?.execution_context?.handoff_id,
      execution_id: result.state.meta_review?.execution_context?.execution_id,
      round: 1,
      attempt: 2
    });
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "confirmed",
      observed_for_handoff_id:
        "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2",
      observed_for_round: 1
    });
    expect(result.gateEnvelope.payload.metadata?.meta_review_handoff_id).toBe(
      "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2"
    );
    expect(delivery.paneBindingActiveCalls).toEqual([]);
    expect(events).toEqual([
      "state_stage",
      "kickoff_append",
      "pane_binding_notification",
      "delivery_observation_persist",
      "observed_result_reconcile"
    ]);

    const nextExecutionContext = assertActiveMetaReviewExecutionContext(
      result.state
    );
    expect(() =>
      assertMetaReviewSubmitStaleGuard({
        bubbleId: result.bubbleId,
        executionContext: nextExecutionContext,
        stateFingerprint: "fresh-fingerprint",
        expectedHandoffId: previousExecutionContext.handoff_id,
        expectedExecutionId: previousExecutionContext.execution_id
      })
    ).toThrow(MetaReviewError);
    expect(() =>
      assertMetaReviewSubmitStaleGuard({
        bubbleId: result.bubbleId,
        executionContext: nextExecutionContext,
        stateFingerprint: "fresh-fingerprint",
        expectedHandoffId: previousExecutionContext.handoff_id,
        expectedExecutionId: nextExecutionContext.execution_id
      })
    ).toThrow(MetaReviewError);
    expect(() =>
      assertMetaReviewSubmitStaleGuard({
        bubbleId: result.bubbleId,
        executionContext: nextExecutionContext,
        stateFingerprint: "fresh-fingerprint",
        expectedHandoffId: nextExecutionContext.handoff_id,
        expectedExecutionId: previousExecutionContext.execution_id
      })
    ).toThrow(MetaReviewError);
    expect(() =>
      assertMetaReviewSubmitStaleGuard({
        bubbleId: result.bubbleId,
        executionContext: nextExecutionContext,
        stateFingerprint: "fresh-fingerprint",
        expectedHandoffId: nextExecutionContext.handoff_id,
        expectedExecutionId: nextExecutionContext.execution_id,
        expectedRole: "meta_reviewer",
        expectedRound: 1,
        expectedStateFingerprint: "fresh-fingerprint"
      })
    ).not.toThrow();
  });

  it("treats a legacy missing clean streak as zero before clean-rerun routing", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });
    delete (loaded.state.meta_review as Partial<NonNullable<BubbleStateSnapshot["meta_review"]>>)
      .consecutive_clean_runs;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
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
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
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
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes,
      fallbackLoaded: loaded
    });
    let writeAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun stage failure fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_stage_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
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
      },
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
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

  it("runs configured approve validation before sticky human-gate bypass", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      stickyHumanGate: true,
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(fixture.runValidationCalls).toEqual([
      {
        kind: "test",
        logPathPrefix: "meta-review-approve-validation"
      }
    ]);
  });

  it("persists post-backstop parity metadata on sticky human-gate bypass success", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      stickyHumanGate: true,
      artifactContent: {
        findings: [{ severity: "P3", title: "advisory follow-up" }],
        summary: { open_total: 1 }
      },
      runResultFactory: (artifact) =>
        createRunResult({
          runId: "run_meta_gate_finalize_sticky_parity_success_01",
          artifactRef: artifact.artifactRef,
          digest: artifact.digest,
          findingsCount: 1,
          blockingOpenTotal: 0,
          advisoryOpenTotal: 1,
          recommendation: "approve"
        })
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(result.gateEnvelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 1,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 1,
      findings_artifact_open_total: 1,
      findings_parity_status: "ok"
    });
  });

  it("keeps sticky non-approve human-gate bypass from running approve validation", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      stickyHumanGate: true,
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      runResult: {
        bubble_id: "b_meta_gate_finalize_threshold_01",
        run_id: "run_meta_gate_finalize_sticky_inconclusive_validation_skip_01",
        recommendation: "inconclusive",
        status: "inconclusive",
        summary: "Meta-review could not make a conclusive recommendation.",
        rework_target_message: null,
        updated_at: "2026-04-22T10:05:00.000Z",
        warnings: []
      }
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_sticky_bypass");
    expect(fixture.runValidationCalls).toEqual([]);
  });

  it("blocks sticky human-gate bypass when approve validation fails", async () => {
    const fixture = await createCleanFinalizeInputFixture({
      stickyHumanGate: true,
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        meta_review_approve_required: ["test"]
      },
      runExitCode: 1
    });

    const result = await finalizeCurrentRunMetaReviewGate(fixture.finalizeInput);

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(result.state.state).toBe("RUNNING");
    expect(result.route).not.toBe("human_gate_sticky_bypass");
    expect(result.state.state).not.toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "META_REVIEW_APPROVE_VALIDATION_FAILED"
    );
    expect(result.gateEnvelope.payload.summary).toContain("stage=exec");
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
    const approveValidationCalls: string[] = [];
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
          commands: {
            test: "pnpm test",
            typecheck: "pnpm typecheck",
            meta_review_approve_required: ["test"]
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
      writeState: write.writeState,
      runMetaReviewApproveValidationCommand: async (command) => {
        approveValidationCalls.push(command.kind);
        return {
          command: command.command,
          exitCode: 0,
          logPath: ".pairflow/evidence/meta-review-approve-validation-test-fixture.log",
          durationMs: 1,
          executionCwd: command.worktreePath
        };
      }
    });

    expect(result.route).toBe("auto_rework");
    expect(approveValidationCalls).toEqual([]);
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
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });
    let appendAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
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
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(write.writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "append_error=simulated kickoff append failure"
    );
  });

  it("fails closed before kickoff when the staged clean rerun has no meta-review execution context", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const writes: BubbleStateSnapshot[] = [];
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes,
      fallbackLoaded: loaded
    });
    let writeAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun missing staged context fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_missing_staged_context_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: async (_path, state) => {
        writeAttempt += 1;
        const writtenState: BubbleStateSnapshot =
          writeAttempt === 1 && state.meta_review !== undefined
            ? {
                ...state,
                execution_context: null,
                meta_review: {
                  ...state.meta_review,
                  execution_context: null
                }
              }
            : state;
        writes.push(writtenState);
        return {
          fingerprint: `written-${writes.length}`,
          state: writtenState
        };
      },
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(append.envelopes[0]?.type).toBe("APPROVAL_REQUEST");
    expect(result.gateEnvelope.payload.summary).toContain(
      "execution_context_missing_before_kickoff"
    );
  });

  it("fails closed after kickoff when clean rerun execution context disappears before delivery observation", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const writes: BubbleStateSnapshot[] = [];
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes,
      fallbackLoaded: loaded
    });
    let contextReadCount = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun missing post-kickoff context fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_missing_post_kickoff_context_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: async (_path, state) => {
        if (
          state.state === "RUNNING" &&
          state.active_role === "meta_reviewer" &&
          state.meta_review?.execution_context !== undefined
        ) {
          const stagedMetaReview = state.meta_review;
          const stagedContext = stagedMetaReview.execution_context ?? null;
          const stagedState: BubbleStateSnapshot = {
            ...state,
            meta_review: {
              ...stagedMetaReview,
              get execution_context() {
                contextReadCount += 1;
                return contextReadCount === 1 ? stagedContext : null;
              }
            }
          };
          writes.push(stagedState);
          return {
            fingerprint: `written-${writes.length}`,
            state: stagedState
          };
        }
        writes.push(state);
        return {
          fingerprint: `written-${writes.length}`,
          state
        };
      },
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(append.envelopes[0]?.type).toBe("TASK");
    expect(result.gateEnvelope.payload.summary).toContain(
      "execution_context_missing"
    );
  });

  it("fails closed before clean rerun staging or kickoff when delivery capabilities are unavailable", async () => {
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
      summary: "Clean rerun missing delivery capability fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_missing_capability_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      writeState: write.writeState
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(append.envelopes).toHaveLength(1);
    expect(append.envelopes[0]?.type).toBe("APPROVAL_REQUEST");
    expect(write.writes[0]?.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "delivery_capability_unavailable"
    );
  });

  it("resets the clean streak when clean rerun pane delivery fails", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun pane failure fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_pane_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: async () => ({
        delivery: {
          status: "failed" as const,
          reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "simulated pane delivery failure"
        },
        shouldDeactivate: true
      })
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(write.writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(write.writes[1]?.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      observed_for_handoff_id:
        "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2"
    });
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "pane_notification_failed=META_REVIEW_REQUEST_DELIVERY_FAILED"
    );
    expect(delivery.paneBindingActiveCalls).toContain(false);
  });

  it("resets the clean streak when clean rerun pane delivery fails without deactivation", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun pane failure no-deactivate fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_pane_failed_no_deactivate_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: async () => ({
        delivery: {
          status: "failed" as const,
          reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
          message: "simulated pane delivery failure without deactivation"
        },
        shouldDeactivate: false
      })
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(write.writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(write.writes[1]?.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_FAILED",
      message: "simulated pane delivery failure without deactivation",
      observed_for_handoff_id:
        "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2"
    });
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "pane_notification_failed=META_REVIEW_REQUEST_DELIVERY_FAILED"
    );
    expect(delivery.paneBindingActiveCalls).not.toContain(false);
  });

  it("persists uncertain clean rerun pane delivery and deactivates before returning running", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun uncertain delivery fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_uncertain_delivery_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: async () => ({
        delivery: {
          status: "uncertain" as const,
          reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
          message: "simulated uncertain pane delivery"
        },
        shouldDeactivate: true
      })
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "simulated uncertain pane delivery",
      observed_for_handoff_id:
        "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2"
    });
    expect(delivery.paneBindingActiveCalls).toContain(false);
  });

  it("resets the clean streak when clean rerun pane notification throws", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun pane notification throw fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_pane_throw_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: async () => {
        throw new Error("simulated pane notification failure");
      }
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(write.writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(write.writes[1]?.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEW_PANE_NOTIFICATION_ERROR",
      observed_for_handoff_id:
        "meta_review:b_meta_gate_finalize_threshold_01:round:1:attempt:2"
    });
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "pane_notification_error=simulated pane notification failure"
    );
    expect(delivery.paneBindingActiveCalls).toContain(false);
  });

  it("records deactivate telemetry when clean rerun pane deactivation fails", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const write = createWriteStateStub();
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes: write.writes,
      fallbackLoaded: loaded
    });
    const paneDelivery = {
      status: "failed" as const,
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
      message: "simulated pane delivery failure"
    };

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun deactivate telemetry fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_deactivate_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: write.writeState,
      setMetaReviewerPane: async () => {
        throw new Error("simulated deactivate failure");
      },
      resolvePaneWarning: async () => ({
        delivery: paneDelivery,
        shouldDeactivate: true
      })
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(write.writes[1]?.meta_review?.runtime_delivery?.message).toContain(
      "deactivate_error=simulated deactivate failure"
    );
    expect(paneDelivery.message).toBe("simulated pane delivery failure");
  });

  it("resets the clean streak when clean rerun delivery observation persistence fails", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const writes: BubbleStateSnapshot[] = [];
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes,
      fallbackLoaded: loaded
    });
    let writeAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun observation failure fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_observation_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: async (_path, state) => {
        writeAttempt += 1;
        if (writeAttempt === 2) {
          throw new Error("simulated runtime delivery observation failure");
        }
        writes.push(state);
        return {
          fingerprint: `written-${writes.length}`,
          state
        };
      },
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "delivery_observation_error=simulated runtime delivery observation failure"
    );
    expect(delivery.paneBindingActiveCalls).toContain(false);
  });

  it("resets the clean streak when clean rerun observed-result reconciliation fails", async () => {
    const artifact = await createArtifactFixture({
      findings: [],
      summary: { open_total: 0 }
    });
    const append = createAppendEnvelopeStub();
    const writes: BubbleStateSnapshot[] = [];
    const loaded = createLoadedRunningState();
    const delivery = createCleanRerunDeliveryStubs({
      envelopes: append.envelopes,
      writes,
      fallbackLoaded: loaded
    });
    let writeAttempt = 0;

    const result = await finalizeCurrentRunMetaReviewGate({
      resolved: {
        bubbleId: "b_meta_gate_finalize_threshold_01",
        bubbleConfig: {
          pairflow_command_profile: "external",
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
          sessionsPath: join(artifact.bubbleDir, "sessions.json"),
          statePath: join(artifact.bubbleDir, "state.json"),
          taskArtifactPath: join(artifact.artifactsDir, "task.md"),
          transcriptPath: join(artifact.bubbleDir, "transcript.ndjson")
        }
      },
      loaded,
      now: new Date("2026-04-22T10:05:00.000Z"),
      refs: [],
      summary: "Clean rerun reconcile failure fixture",
      runResult: createCleanApproveRunResult({
        runId: "run_meta_gate_finalize_clean_reconcile_failed_01",
        artifactOpenTotal: 0
      }),
      readFileFn: (path, encoding) => readFile(path, encoding),
      appendEnvelope: append.appendEnvelope,
      readState: delivery.readState,
      readTranscript: delivery.readTranscript,
      writeState: async (_path, state) => {
        writeAttempt += 1;
        const writtenState =
          writeAttempt === 2
            ? {
                ...state,
                state: "READY_FOR_HUMAN_APPROVAL" as const,
                active_role: null,
                active_agent: null
              }
            : state;
        writes.push(writtenState);
        return {
          fingerprint: `written-${writes.length}`,
          state: writtenState
        };
      },
      setMetaReviewerPane: delivery.setMetaReviewerPane,
      resolvePaneWarning: delivery.resolvePaneWarning
    });

    expect(result.route).toBe("human_gate_dispatch_failed");
    expect(writes[0]?.meta_review?.consecutive_clean_runs).toBe(1);
    expect(writes[1]?.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(result.state.meta_review?.consecutive_clean_runs).toBe(0);
    expect(result.gateEnvelope.payload.summary).toContain(
      "observation_reconcile_error=META_REVIEW_GATE_TRANSITION_INVALID"
    );
    expect(delivery.paneBindingActiveCalls).toContain(false);
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
