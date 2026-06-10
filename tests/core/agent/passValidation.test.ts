import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import {
  emitPassFromWorkspace
} from "../../../src/v11/application/pass/passCommandOrchestration.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import type { EmitPassResult } from "../../../src/v11/application/pass/passCommandContract.js";
import { PassCommandError } from "../../../src/v11/application/pass/internal/normalPass/passCommandError.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/v11/domain/state/execution/executionContext.js";
import {
  readStateSnapshot,
  writeStateSnapshot as rawWriteStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../src/v11/domain/state/snapshot/projection.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  resolveReviewerTestExecutionDirective
} from "../../../src/v11/infrastructure/artifact/reviewer/testEvidenceRuntime.js";
import {
  resolvePassValidationReviewerCompatibilityArtifactPath
} from "../../../src/v11/infrastructure/artifact/validation/passValidationEvidence.js";
import { initGitRepository } from "../../helpers/git.js";
import { writeEvidenceLog } from "../../helpers/evidence.js";
import type {
  PassProtocolEnvelopePayload
} from "../../../src/v11/shared/protocol/protocolEnvelopeContract.js";

const tempDirs: string[] = [];
const defaultWatchdogTimeoutMinutes = 60;

type PassTestState = unknown;

function resolveWatchdogTimeoutMinutes(
  state: ReturnType<typeof toPersistedSnapshot>
): number {
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

function passPayload(result: EmitPassResult): PassProtocolEnvelopePayload {
  expect(result.resultEnvelopeKind).toBe("pass");
  expect(result.envelope.type).toBe("PASS");
  if (result.resultEnvelopeKind !== "pass" || result.envelope.type !== "PASS") {
    throw new Error("Expected pass result envelope.");
  }
  return result.envelope.payload;
}

function normalizeTestStateForWrite(
  state: PassTestState
): BubbleStateSnapshot {
  const persisted = toPersistedSnapshot(buildBubbleStateSnapshotVariant(state as PersistedBubbleStateSnapshot));
  if (persisted.state === "RUNNING" && persisted.active_role === "meta_reviewer") {
    return buildBubbleStateSnapshotVariant({
      ...persisted,
      execution_context: metaReviewExecutionContextToRunningContext(
        persisted.meta_review?.execution_context ?? null
      )
    });
  }

  if (persisted.state === "RUNNING") {
    if (persisted.round === 0) {
      return buildBubbleStateSnapshotVariant({
        ...persisted,
        execution_context: null
      });
    }
    if (persisted.active_role !== null && persisted.active_since !== null) {
      return buildBubbleStateSnapshotVariant({
        ...persisted,
        execution_context: buildRunningExecutionContext({
          bubbleId: persisted.bubble_id,
          round: persisted.round,
          activeRole: persisted.active_role,
          startedAt: persisted.active_since,
          watchdogTimeoutMinutes: resolveWatchdogTimeoutMinutes(persisted),
          attempt: persisted.execution_context?.attempt ?? 1
        })
      });
    }
  }

  return buildBubbleStateSnapshotVariant({
    ...persisted,
    execution_context: null
  });
}

async function writeStateSnapshot(
  statePath: Parameters<typeof rawWriteStateSnapshot>[0],
  state: PassTestState,
  options?: Parameters<typeof rawWriteStateSnapshot>[2]
): ReturnType<typeof rawWriteStateSnapshot> {
  return rawWriteStateSnapshot(
    statePath,
    normalizeTestStateForWrite(state),
    options
  );
}

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-pass-command-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

function normalizeTestBubbleId(id: string): string {
  const trimmed = id.trim();
  if (/^[a-z][a-z0-9_-]{2,39}$/u.test(trimmed)) {
    return trimmed;
  }

  const hashSuffix = createHash("sha1")
    .update(trimmed)
    .digest("hex")
    .slice(0, 10);
  const prefixMaxLength = 40 - 1 - hashSuffix.length;
  const normalizedPrefix = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gu, "-")
    .replace(/^[^a-z]+/u, "")
    .slice(0, prefixMaxLength)
    .replace(/[-_]+$/u, "");

  const safePrefix =
    normalizedPrefix.length >= 3 ? normalizedPrefix : "bubble";
  const candidate = `${safePrefix}-${hashSuffix}`.slice(0, 40);

  if (/^[a-z][a-z0-9_-]{2,39}$/u.test(candidate)) {
    return candidate;
  }

  return `bubble-${hashSuffix}`.slice(0, 40);
}

async function setupRunningBubbleFixture(input: {
  repoPath: string;
  bubbleId: string;
  task: string;
  reviewerBrief?: string;
  accuracyCritical?: boolean;
  reviewArtifactType?: "code" | "document";
}) {
  const bubble = await createBubble({
    id: normalizeTestBubbleId(input.bubbleId),
    repoPath: input.repoPath,
    baseBranch: "main",
    reviewArtifactType: input.reviewArtifactType ?? "code",
    task: input.task,
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.accuracyCritical === true ? { accuracyCritical: true } : {}),
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

async function setReviewerActive(worktreeStatePath: string, reviewerAgent: "codex" | "claude"): Promise<void> {
  const loaded = await readStateSnapshot(worktreeStatePath);
  await writeStateSnapshot(
    worktreeStatePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 1,
      active_agent: reviewerAgent,
      active_role: "reviewer",
      active_since: "2026-02-21T12:06:00.000Z",
      last_command_at: "2026-02-21T12:06:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitPassFromWorkspace validation", { timeout: 20_000 }, () => {
  it("writes reviewer compatibility artifact for implementer PASS when validation policy is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16",
      task: "Implement pass flow"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    await emitPassFromWorkspace({
      summary: "Validation complete",
      refs: [evidenceLogPath],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    const rawArtifact = await readFile(
      resolvePassValidationReviewerCompatibilityArtifactPath(bubble.paths.artifactsDir),
      "utf8"
    );
    const artifact = JSON.parse(rawArtifact) as {
      status: string;
      decision: string;
      reason_code: string;
    };

    expect(artifact.status).toBe("untrusted");
    expect(artifact.decision).toBe("run_checks");
    expect(artifact.reason_code).toBe("pass_validation_policy_missing");
  });

  it("writes trusted configured pass-validation artifacts and refs for implementer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16_configured",
      task: "Configured validation happy path"
    });

    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        commands: {
          ...bubble.config.commands,
          lint: "printf 'lint ok\\n'",
          typecheck: "printf 'typecheck ok\\n'",
          test: "printf 'test ok\\n'",
          validation_required: ["lint", "typecheck", "test"]
        }
      }),
      "utf8"
    );

    await emitPassFromWorkspace({
      summary: "Validation complete",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    const rawReviewerArtifact = await readFile(
      resolvePassValidationReviewerCompatibilityArtifactPath(bubble.paths.artifactsDir),
      "utf8"
    );
    const reviewerArtifact = JSON.parse(rawReviewerArtifact) as {
      status: string;
      decision: string;
      reason_code: string;
    };

    expect(reviewerArtifact.status).toBe("trusted");
    expect(reviewerArtifact.decision).toBe("skip_full_rerun");
    expect(reviewerArtifact.reason_code).toBe("no_trigger");

    const rawPassValidationArtifact = await readFile(
      join(bubble.paths.artifactsDir, "pass-validation-evidence.json"),
      "utf8"
    );
    const passValidationArtifact = JSON.parse(rawPassValidationArtifact) as {
      policy_state: string;
      required_command_set_id: string | null;
      trust_level: string;
      commands: Array<{ kind: string; log_path?: string; exit_code?: number }>;
    };

    expect(passValidationArtifact.policy_state).toBe("policy_configured");
    expect(passValidationArtifact.required_command_set_id).toBe("lint__typecheck__test");
    expect(passValidationArtifact.trust_level).toBe("trusted");
    expect(passValidationArtifact.commands).toHaveLength(3);
    expect(passValidationArtifact.commands[0]).toMatchObject({
      kind: "lint",
      command: "printf 'lint ok\\n'",
      log_path: ".pairflow/evidence/pass-validation-lint.log",
      exit_code: 0
    });
    expect(passValidationArtifact.commands[1]).toMatchObject({
      kind: "typecheck",
      command: "printf 'typecheck ok\\n'",
      log_path: ".pairflow/evidence/pass-validation-typecheck.log",
      exit_code: 0
    });
    expect(passValidationArtifact.commands[2]).toMatchObject({
      kind: "test",
      command: "printf 'test ok\\n'",
      log_path: ".pairflow/evidence/pass-validation-test.log",
      exit_code: 0
    });

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const lastMessage = transcript[transcript.length - 1];
    expect(lastMessage?.type).toBe("PASS");
    expect(lastMessage?.refs).toEqual([
      ".pairflow/evidence/pass-validation-lint.log",
      ".pairflow/evidence/pass-validation-typecheck.log",
      ".pairflow/evidence/pass-validation-test.log"
    ]);
  });

  it("does not preserve trusted skip via compatibility artifact after the worktree changes", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16_configured_stale_guard",
      task: "Configured validation stale guard"
    });

    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        commands: {
          ...bubble.config.commands,
          typecheck: "printf 'typecheck ok\\n'",
          validation_required: ["typecheck"]
        }
      }),
      "utf8"
    );

    await emitPassFromWorkspace({
      summary: "Validation complete",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:06:00.000Z")
    });

    await writeFile(join(bubble.paths.worktreePath, "post-pass-change.txt"), "x\n", "utf8");

    const directive = await resolveReviewerTestExecutionDirective({
      artifactPath: resolvePassValidationReviewerCompatibilityArtifactPath(
        bubble.paths.artifactsDir
      ),
      worktreePath: bubble.paths.worktreePath
    });

    expect(directive.skip_full_rerun).toBe(false);
    expect(directive.reason_code).toBe("evidence_missing");
    expect(directive.verification_status).toBe("missing");
  });

  it("surfaces compatibility-artifact write failure reason in normal PASS results", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_compat_write_warning_01",
      task: "Compatibility artifact write warning"
    });

    await mkdir(
      resolvePassValidationReviewerCompatibilityArtifactPath(bubble.paths.artifactsDir),
      { recursive: true }
    );

    const result = await emitPassFromWorkspace({
      summary: "Validation complete",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.transitionDecision).toBe("normal_pass");
    expect(result.passValidationCompatibilityArtifactWriteFailureReason).toContain(
      "pass_validation_reviewer_compat_artifact_persist_failed"
    );
    expect(result.passValidationCompatibilityArtifactWriteFailureReason).toContain("EISDIR");
  });

  it("writes trusted docs-only reviewer artifact and skip directive for document PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16_docs",
      task: "Document-only pass flow",
      reviewArtifactType: "document"
    });

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
          reason_detail: string;
          verification_status: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Docs-only scope update",
        refs: [],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitDeliveryNotificationAck: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            status: "accepted",
            message: "ok"
          });
        }
      }
    );

    const rawArtifact = await readFile(
      join(bubble.paths.artifactsDir, "reviewer-test-verification.json"),
      "utf8"
    );
    const artifact = JSON.parse(rawArtifact) as {
      status: string;
      decision: string;
      reason_code: string;
      reason_detail: string;
      required_commands: string[];
      command_evidence: unknown[];
      git: {
        commit_sha: string | null;
        status_hash: string | null;
        dirty: boolean | null;
      };
    };

    expect(artifact.status).toBe("trusted");
    expect(artifact.decision).toBe("skip_full_rerun");
    expect(artifact.reason_code).toBe("no_trigger");
    expect(artifact.reason_detail).toContain("docs-only scope, runtime checks not required");
    expect(artifact.required_commands).toEqual([]);
    expect(artifact.command_evidence).toEqual([]);
    expect(artifact.git).toEqual({
      commit_sha: null,
      status_hash: null,
      dirty: null
    });
    expect(capturedDirective?.skip_full_rerun).toBe(true);
    expect(capturedDirective?.reason_code).toBe("no_trigger");
    expect(capturedDirective?.verification_status).toBe("trusted");
    expect(capturedDirective?.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
  });

  it("rejects docs-only implementer PASS when skip claim is combined with runtime log refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_ref_conflict_01",
      task: "Docs-only pass conflict guard",
      reviewArtifactType: "document"
    });
    const beforeTranscript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);

    await expect(
      emitPassFromWorkspace({
        summary: "Runtime checks intentionally not executed in this docs-only round.",
        refs: [
          ".pairflow/evidence/lint.log",
          ".pairflow/evidence/typecheck.log"
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      })
    ).rejects.toThrow(/^DOCS_ONLY_SKIP_LOG_REF_CONFLICT:/u);

    const afterTranscript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(afterTranscript).toHaveLength(beforeTranscript.length);
    expect(afterTranscript.map((entry) => entry.type)).toEqual(["TASK"]);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.active_role).toBe("implementer");
    expect(loaded.state.active_agent).toBe(bubble.config.agents.implementer);
    expect(loaded.state.round).toBe(1);
  });

  it("surfaces stable docs-only conflict reason diagnostics with deterministic marker+regex classification", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_ref_conflict_02",
      task: "Docs-only reason code lock",
      reviewArtifactType: "document"
    });

    try {
      await emitPassFromWorkspace({
        summary: "Runtime   checks   WERE intentionally   not executed in docs-only scope.",
        refs: [
          "artifact://handoff.md",
          ".pairflow/evidence/lint.log",
          ".pairflow/evidence/test.log.bak",
          ".pairflow/evidence/with space.log"
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:30.000Z")
      });
      throw new Error("expected docs-only conflict to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PassCommandError);
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/^DOCS_ONLY_SKIP_LOG_REF_CONFLICT:/u);
      expect(message).toContain("\"conflicting_ref_count\":1");
      expect(message).toContain("\"ref_class\":\"runtime_log_ref\"");
      expect(message).toContain("\"ref_pattern\":\"^\\\\.pairflow/evidence/[^\\\\s]+\\\\.log$\"");
    }
  });

  it("treats subdirectory .log refs as runtime logs and excludes double-extension refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_regex_boundary_02",
      task: "Docs-only regex boundary for subdirectory and double-extension refs",
      reviewArtifactType: "document"
    });

    try {
      await emitPassFromWorkspace({
        summary: "Runtime checks intentionally not executed for docs-only scope.",
        refs: [
          ".pairflow/evidence/subdir/lint.log",
          ".pairflow/evidence/lint.log.bak"
        ],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:35.000Z")
      });
      throw new Error("expected docs-only conflict to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/^DOCS_ONLY_SKIP_LOG_REF_CONFLICT:/u);
      expect(message).toContain("\"conflicting_ref_count\":1");
      expect(message).toContain("\"example_refs\":\".pairflow/evidence/subdir/lint.log\"");
      expect(message).not.toContain(".pairflow/evidence/lint.log.bak");
    }
  });

  it("allows docs-only implementer skip-claim PASS when refs are omitted (empty baseline path)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_no_refs_omitted_01",
      task: "Docs-only skip-claim baseline with omitted refs",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed in this docs-only round.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:45.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([]);
  });

  it("caps docs-only conflict example_refs diagnostics to the first three runtime refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_example_refs_cap_01",
      task: "Docs-only conflict example_refs slice cap",
      reviewArtifactType: "document"
    });

    const refs = [
      ".pairflow/evidence/lint.log",
      ".pairflow/evidence/typecheck.log",
      ".pairflow/evidence/test.log",
      ".pairflow/evidence/extra.log"
    ];
    try {
      await emitPassFromWorkspace({
        summary: "Runtime checks intentionally not executed in this docs-only round.",
        refs,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:55.000Z")
      });
      throw new Error("expected docs-only conflict to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("\"conflicting_ref_count\":4");
      expect(message).toContain(
        "\"example_refs\":\".pairflow/evidence/lint.log,.pairflow/evidence/typecheck.log,.pairflow/evidence/test.log\""
      );
      expect(message).not.toContain(".pairflow/evidence/extra.log");
    }
  });

  it("treats space-containing .log refs as non-runtime-log boundary under docs-only guard regex", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_space_boundary_01",
      task: "Docs-only regex boundary for space-containing log refs",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed for docs-only scope.",
      refs: [".pairflow/evidence/with space.log"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:40.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/with space.log"]);
  });

  it("does not apply docs-only skip/log conflict guard to reviewer PASS (implementer-only guard bypass)", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_reviewer_bypass_01",
      task: "Reviewer-role bypass regression for docs-only skip/log guard",
      reviewArtifactType: "document"
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed in this docs-only review pass.",
      refs: [".pairflow/evidence/lint.log"],
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:50.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.sender).toBe(bubble.config.agents.reviewer);
    expect(passPayload(result).pass_intent).toBe("review");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/lint.log"]);
  });

  it("allows docs-only implementer PASS when skip claim has no runtime log refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_no_logs_01",
      task: "Docs-only pass without runtime log refs",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks were intentionally not executed due to docs-only scope.",
      refs: ["artifact://handoff.md"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:06:00.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(passPayload(result).pass_intent).toBe("review");
    expect(result.envelope.refs).toEqual(["artifact://handoff.md"]);
  });

  it("does not block docs-only implementer PASS when skip marker is absent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_negative_01",
      task: "Docs-only pass marker negative",
      reviewArtifactType: "document"
    });

    const result = await emitPassFromWorkspace({
      summary: "Validation status captured for docs update.",
      refs: [".pairflow/evidence/lint.log"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:06:30.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/lint.log"]);
  });

  it("does not apply docs-only skip/log conflict guard to non-document bubbles", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_docs_skip_negative_02",
      task: "Code bubble should ignore docs-only skip/log guard",
      reviewArtifactType: "code"
    });

    const result = await emitPassFromWorkspace({
      summary: "Runtime checks intentionally not executed in this round.",
      refs: [".pairflow/evidence/lint.log"],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.resultEnvelopeKind).toBe("pass");
    expect(result.envelope.refs).toEqual([".pairflow/evidence/lint.log"]);
  });

  it("fails closed when pass validation artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_17",
      task: "Implement pass flow",
      reviewArtifactType: "code"
    });

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    await expect(
      emitPassFromWorkspace(
        {
          summary: "Validation complete",
          refs: [evidenceLogPath],
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-21T12:05:00.000Z")
        },
        {
          emitDeliveryNotificationAck: () =>
            Promise.resolve({
              status: "accepted",
              message: "ok",
              sessionName: "pf_bubble",
              targetPaneIndex: 1
            })
        }
      )
    ).rejects.toThrow(/pass_validation_artifact_persist_failed/u);
  });

  it("falls back to docs-only skip directive when artifact write fails in document scope", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_17_docs",
      task: "Docs-only pass flow",
      reviewArtifactType: "document"
    });

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
          reason_detail: string;
          verification_status: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Docs-only change complete",
        refs: [],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitDeliveryNotificationAck: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          });
        }
      }
    );

    expect(capturedDirective?.skip_full_rerun).toBe(true);
    expect(capturedDirective?.reason_code).toBe("no_trigger");
    expect(capturedDirective?.verification_status).toBe("trusted");
    expect(capturedDirective?.reason_detail).toContain(
      "docs-only scope, runtime checks not required"
    );
  });

  it("rejects accuracy-critical reviewer PASS when verification ref is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_01",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/requires a --ref to review-verification-input.json/u);
  });

  it("rejects accuracy-critical reviewer PASS when verification basename does not match", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_02",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const wrongFile = join(bubble.paths.worktreePath, "verification.json");
    await writeFile(wrongFile, "{\"schema\":\"review_verification_v1\"}", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [wrongFile],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/requires a --ref to review-verification-input.json/u);
  });

  it("rejects accuracy-critical reviewer PASS on invalid verification payload JSON", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_03",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(verificationInput, "{ not-json", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Invalid JSON in review-verification-input.json/u);
  });

  it("rejects accuracy-critical reviewer PASS on schema mismatch and invalid overall-intent mapping", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_04",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "wrong_schema",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/x.ts:1"]
          }
        ]
      }),
      "utf8"
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Invalid review_verification_v1 payload/u);

    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "fail",
        claims: [
          {
            claim_id: "C1",
            status: "mismatch",
            evidence_refs: ["src/x.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/overall=fail requires intent=fix_request and open findings/u);

    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "pass",
        claims: [
          {
            claim_id: "C1",
            status: "verified",
            evidence_refs: ["src/x.ts:1"]
          }
        ]
      }),
      "utf8"
    );
    await expect(
      emitPassFromWorkspace({
        summary: "Review found issue",
        findings: [
          {
            severity: "P2",
            title: "Needs changes"
          }
        ],
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/overall=pass requires clean handoff/u);
  });

  it("writes deterministic review-verification artifact and overwrites on later successful reviewer pass", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_05",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

    const verificationInput = join(
      bubble.paths.worktreePath,
      "review-verification-input.json"
    );
    await writeFile(
      verificationInput,
      JSON.stringify({
        schema: "review_verification_v1",
        overall: "fail",
        claims: [
          {
            claim_id: "C1",
            status: "mismatch",
            evidence_refs: ["src/a.ts:10"]
          }
        ]
      }),
      "utf8"
    );

    await emitPassFromWorkspace({
      summary: "Need fixes",
      findings: [
        {
          severity: "P2",
          title: "Incorrect claim"
        }
      ],
      refs: [verificationInput],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:10:00.000Z")
    });

    const firstArtifactRaw = await readFile(
      bubble.paths.reviewVerificationArtifactPath,
      "utf8"
    );
    const firstArtifact = JSON.parse(firstArtifactRaw) as {
      schema: string;
      overall: string;
      input_ref: string;
      meta: {
        round: number;
      };
      validation: {
        status: string;
        errors: unknown[];
      };
    };
    expect(firstArtifact.schema).toBe("review_verification_v1");
    expect(firstArtifact.overall).toBe("fail");
    expect(firstArtifact.input_ref).toBe("review-verification-input.json");
    expect(firstArtifact.meta.round).toBe(2);
    expect(firstArtifact.validation).toEqual({
      status: "valid",
      errors: []
    });

    await emitPassFromWorkspace({
      summary: "Implemented fixes",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:11:00.000Z")
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
            evidence_refs: ["src/a.ts:18"]
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
      now: new Date("2026-02-21T12:12:00.000Z")
    });

    const secondArtifactRaw = await readFile(
      bubble.paths.reviewVerificationArtifactPath,
      "utf8"
    );
    const secondArtifact = JSON.parse(secondArtifactRaw) as {
      overall: string;
      claims: Array<{ evidence_refs?: string[] }>;
      meta: {
        round: number;
      };
    };
    expect(secondArtifact.overall).toBe("pass");
    expect(secondArtifact.meta.round).toBe(3);
    expect(secondArtifact.claims[0]?.evidence_refs).toEqual(["src/a.ts:18"]);
  });

  it("keeps state unchanged when appended accuracy-critical reviewer PASS cannot write verification artifact", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_acc_06",
      task: "Accuracy-critical pass",
      accuracyCritical: true,
      reviewerBrief: "Require verification payload."
    });
    await setReviewerActive(bubble.paths.statePath, bubble.config.agents.reviewer);

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
            evidence_refs: ["src/a.ts:42"]
          }
        ]
      }),
      "utf8"
    );

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        refs: [verificationInput],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/review-verification artifact write failed before state transition/u);

    const stateAfter = await readStateSnapshot(bubble.paths.statePath);
    expect(stateAfter.state.active_role).toBe("reviewer");
    expect(stateAfter.state.active_agent).toBe(bubble.config.agents.reviewer);
    expect(stateAfter.state.round).toBe(1);

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript[transcript.length - 1]?.type).toBe("PASS");
  });

});
