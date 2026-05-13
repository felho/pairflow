import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import * as actorEmitContextModule from "../../src/v11/defaults/actorProtocol/actorEmitContextDefaults.js";
import {
  getAgentEmitHelpText,
  parseAgentEmitCommandOptions,
  runAgentEmitCommand
} from "../../src/cli/commands/agent/emit.js";
import { readStateSnapshot } from "../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../helpers/bubble.js";
import { initGitRepository } from "../helpers/git.js";
import {
  buildMetaReviewExecutionContext
} from "../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../src/v11/domain/state/execution/executionContext.js";
import type { AgentName } from "../../src/contracts/kernel/agentIdentity.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../helpers/stateSnapshot.js";
const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-cli-agent-emit-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function switchFixtureToReviewerAuthority(input: {
  bubbleId: string;
  statePath: string;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  startedAt?: string;
}): Promise<void> {
  const loaded = await readStateSnapshot(input.statePath);
  const startedAt = input.startedAt ?? "2026-03-24T10:10:00.000Z";
  await writeStateSnapshot(
    input.statePath,
    {
      ...loaded.state,
      active_agent: input.reviewer,
      active_role: "reviewer",
      execution_context: buildRunningExecutionContext({
        bubbleId: input.bubbleId,
        round: loaded.state.round,
        activeRole: "reviewer",
        startedAt,
        watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
      }),
      active_since: startedAt,
      last_command_at: startedAt
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("parseAgentEmitCommandOptions", () => {
  it("supports help", () => {
    const parsed = parseAgentEmitCommandOptions(["--help"]);
    expect(parsed).toEqual({ help: true });
    expect(getAgentEmitHelpText()).toContain("pairflow agent emit --kind pass");
    expect(getAgentEmitHelpText()).toContain("Phase 5 note:");
  });

  it("parses meta-review result payload", () => {
    const parsed = parseAgentEmitCommandOptions([
      "--kind",
      "meta_review_result",
      "--repo",
      "/tmp/repo",
      "--bubble-id",
      "b_agent_emit_meta_01",
      "--handoff-id",
      "meta_review:b_agent_emit_meta_01:round:2:attempt:1",
      "--execution-id",
      "exec_b_agent_emit_meta_01_round2",
      "--round",
      "2",
      "--recommendation",
      "approve",
      "--summary",
      "Ready",
      "--report-json",
      "{\"findings_count\":0,\"findings_claim_state\":\"clean\",\"findings_claim_source\":\"meta_review_artifact\"}"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected agent emit options.");
    }

    expect(parsed.input.kind).toBe("meta_review_result");
    if (parsed.input.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result input.");
    }
    expect(parsed.input.round).toBe(2);
    expect(parsed.input.recommendation).toBe("approve");
    expect(parsed.input.report_json).toEqual({
      findings_count: 0,
      findings_claim_state: "clean",
      findings_claim_source: "meta_review_artifact"
    });
  });

  it("parses pass payload with optional intent, findings, and guards", () => {
    const parsed = parseAgentEmitCommandOptions([
      "--kind",
      "pass",
      "--repo",
      "/tmp/repo",
      "--bubble-id",
      "b_agent_emit_pass_parse_01",
      "--handoff-id",
      "implementer:b_agent_emit_pass_parse_01:round:1:attempt:1",
      "--execution-id",
      "exec_b_agent_emit_pass_parse_01_round1",
      "--expected-role",
      "implementer",
      "--expected-round",
      "1",
      "--expected-state-fingerprint",
      "fp_pass_01",
      "--summary",
      "Implemented the requested change",
      "--intent",
      "fix_request",
      "--finding",
      "P2:Needs follow-up|src/example.ts",
      "--ref",
      ".pairflow/evidence/typecheck.log"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected agent emit options.");
    }

    expect(parsed.input).toMatchObject({
      kind: "pass",
      repo: "/tmp/repo",
      bubble_id: "b_agent_emit_pass_parse_01",
      handoff_id: "implementer:b_agent_emit_pass_parse_01:round:1:attempt:1",
      execution_id: "exec_b_agent_emit_pass_parse_01_round1",
      expected_role: "implementer",
      expected_round: 1,
      expected_state_fingerprint: "fp_pass_01",
      summary: "Implemented the requested change",
      intent: "fix_request",
      refs: [".pairflow/evidence/typecheck.log"]
    });
    if (parsed.input.kind !== "pass") {
      throw new Error("Expected pass input.");
    }
    expect(parsed.input.findings).toEqual([
      {
        priority: "P2",
        severity: "P2",
        title: "Needs follow-up",
        timing: "later-hardening",
        layer: "L1",
        refs: ["src/example.ts"]
      }
    ]);
  });

  it("parses human_question payload", () => {
    const parsed = parseAgentEmitCommandOptions([
      "--kind",
      "human_question",
      "--repo",
      "/tmp/repo",
      "--bubble-id",
      "b_agent_emit_human_parse_01",
      "--handoff-id",
      "reviewer:b_agent_emit_human_parse_01:round:1:attempt:1",
      "--execution-id",
      "exec_b_agent_emit_human_parse_01_round1",
      "--question",
      "Need product input on the fallback copy",
      "--ref",
      ".pairflow/evidence/test.log"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected agent emit options.");
    }

    expect(parsed.input).toEqual({
      kind: "human_question",
      repo: "/tmp/repo",
      bubble_id: "b_agent_emit_human_parse_01",
      handoff_id: "reviewer:b_agent_emit_human_parse_01:round:1:attempt:1",
      execution_id: "exec_b_agent_emit_human_parse_01_round1",
      question: "Need product input on the fallback copy",
      refs: [".pairflow/evidence/test.log"]
    });
  });

  it("parses convergence payload with structured findings", () => {
    const parsed = parseAgentEmitCommandOptions([
      "--kind",
      "convergence",
      "--repo",
      "/tmp/repo",
      "--bubble-id",
      "b_agent_emit_convergence_parse_01",
      "--handoff-id",
      "reviewer:b_agent_emit_convergence_parse_01:round:2:attempt:1",
      "--execution-id",
      "exec_b_agent_emit_convergence_parse_01_round2",
      "--summary",
      "Review converged with one non-blocking follow-up",
      "--finding",
      "P3:Document retained submit callers|plans/tasks/retained-submit.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected agent emit options.");
    }

    expect(parsed.input).toMatchObject({
      kind: "convergence",
      repo: "/tmp/repo",
      bubble_id: "b_agent_emit_convergence_parse_01",
      handoff_id: "reviewer:b_agent_emit_convergence_parse_01:round:2:attempt:1",
      execution_id: "exec_b_agent_emit_convergence_parse_01_round2",
      summary: "Review converged with one non-blocking follow-up",
      refs: []
    });
    if (parsed.input.kind !== "convergence") {
      throw new Error("Expected convergence input.");
    }
    expect(parsed.input.findings).toEqual([
      {
        severity: "P3",
        title: "Document retained submit callers",
        refs: ["plans/tasks/retained-submit.md"]
      }
    ]);
  });

  it("rejects non-integer expected-round values", () => {
    expect(() =>
      parseAgentEmitCommandOptions([
        "--kind",
        "pass",
        "--repo",
        "/tmp/repo",
        "--bubble-id",
        "b_agent_emit_float_round_01",
        "--handoff-id",
        "implementer:b_agent_emit_float_round_01:round:1:attempt:1",
        "--execution-id",
        "exec_b_agent_emit_float_round_01_round1",
        "--expected-round",
        "2.5",
        "--summary",
        "Should fail"
      ])
    ).toThrow(
      "ACTOR_EMIT_OPTIONS_INVALID: --expected-round must be a positive integer."
    );
  });

  it("rejects missing execution_id instead of deriving it from handoff_id", () => {
    expect(() =>
      parseAgentEmitCommandOptions([
        "--kind",
        "pass",
        "--repo",
        "/tmp/repo",
        "--bubble-id",
        "b_agent_emit_override_01",
        "--handoff-id",
        "implementer:b_agent_emit_override_01:round:1:attempt:1",
        "--summary",
        "Should fail"
      ])
    ).toThrow(
      "ACTOR_EMIT_INPUT_EXECUTION_ID_MISSING: Missing required option: --execution-id (handoff_id cannot be used to derive execution_id)."
    );
  });

  it("rejects execution_id values that reuse the handoff_id authority token", () => {
    expect(() =>
      parseAgentEmitCommandOptions([
        "--kind",
        "pass",
        "--repo",
        "/tmp/repo",
        "--bubble-id",
        "b_agent_emit_override_02",
        "--handoff-id",
        "implementer:b_agent_emit_override_02:round:1:attempt:1",
        "--execution-id",
        "implementer:b_agent_emit_override_02:round:1:attempt:1",
        "--summary",
        "Should fail"
      ])
    ).toThrow(
      "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: --execution-id must not equal --handoff-id; inferred execution authority is forbidden."
    );
  });

  it("rejects explicit target-authority override flags on the public emit surface", () => {
    expect(() =>
      parseAgentEmitCommandOptions([
        "--kind",
        "pass",
        "--repo",
        "/tmp/repo",
        "--bubble-id",
        "b_agent_emit_override_03",
        "--handoff-id",
        "implementer:b_agent_emit_override_03:round:1:attempt:1",
        "--execution-id",
        "exec_b_agent_emit_override_03_round1",
        "--summary",
        "Should fail",
        "--target-authority",
        "reviewer"
      ])
    ).toThrow(/ACTOR_EMIT_OPTIONS_INVALID: Unknown option '--target-authority'/u);
  });
});

describe("runAgentEmitCommand", () => {
  it("emits PASS through the canonical actor boundary with explicit context", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_agent_emit_pass_01",
      task: "Canonical pass emit"
    });
    const loadedState = await readStateSnapshot(bubble.paths.statePath);
    const handoffId = loadedState.state.execution_context?.handoff_id;
    const executionId = loadedState.state.execution_context?.execution_id;
    expect(handoffId).toBeDefined();
    expect(executionId).toBeDefined();

    const result = await runAgentEmitCommand([
      "--kind",
      "pass",
      "--repo",
      repoPath,
      "--bubble-id",
      bubble.bubbleId,
      "--handoff-id",
      String(handoffId),
      "--execution-id",
      String(executionId),
      "--summary",
      "Implemented canonical pass"
    ]);

    expect(result).not.toBeNull();
    expect(result?.kind).toBe("pass");
    if (result === null || result.kind !== "pass") {
      throw new Error("Expected pass result.");
    }
    expect(result.pass.bubbleId).toBe(bubble.bubbleId);
    expect(result.pass.envelope.payload.summary).toBe("Implemented canonical pass");
  });

  it("rejects duplicate implementer emits after authority already advanced", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_agent_emit_pass_dup_01",
      task: "Canonical duplicate pass emit"
    });
    const loadedState = await readStateSnapshot(bubble.paths.statePath);
    const handoffId = loadedState.state.execution_context?.handoff_id;
    const executionId = loadedState.state.execution_context?.execution_id;
    expect(handoffId).toBeDefined();
    expect(executionId).toBeDefined();

    await runAgentEmitCommand([
      "--kind",
      "pass",
      "--repo",
      repoPath,
      "--bubble-id",
      bubble.bubbleId,
      "--handoff-id",
      String(handoffId),
      "--execution-id",
      String(executionId),
      "--summary",
      "First canonical pass"
    ]);

    const afterFirstPass = await readStateSnapshot(bubble.paths.statePath);
    const reviewerHandoffId = afterFirstPass.state.execution_context?.handoff_id;
    expect(reviewerHandoffId).toBeDefined();
    expect(reviewerHandoffId).not.toBe(String(handoffId));
    expect(afterFirstPass.state.active_role).toBe("reviewer");

    await expect(
      runAgentEmitCommand([
        "--kind",
        "pass",
        "--repo",
        repoPath,
        "--bubble-id",
        bubble.bubbleId,
        "--handoff-id",
        String(handoffId),
        "--execution-id",
        String(executionId),
        "--summary",
        "Duplicate canonical pass"
      ])
    ).rejects.toThrow(/Canonical actor emit handoff mismatch/u);

    const afterDuplicateReject = await readStateSnapshot(bubble.paths.statePath);
    expect(afterDuplicateReject.fingerprint).toBe(afterFirstPass.fingerprint);
    expect(afterDuplicateReject.state.execution_context?.handoff_id).toBe(
      reviewerHandoffId
    );
    expect(afterDuplicateReject.state.active_role).toBe("reviewer");
  });

  it("rejects duplicate reviewer pass emits after authority already advanced", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_agent_emit_reviewer_pass_dup_01",
      task: "Canonical duplicate reviewer pass emit"
    });
    await switchFixtureToReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      reviewer: bubble.config.agents.reviewer,
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
    });

    const loadedState = await readStateSnapshot(bubble.paths.statePath);
    const handoffId = loadedState.state.execution_context?.handoff_id;
    const executionId = loadedState.state.execution_context?.execution_id;
    expect(handoffId).toBeDefined();
    expect(executionId).toBeDefined();

    await runAgentEmitCommand([
      "--kind",
      "pass",
      "--repo",
      repoPath,
      "--bubble-id",
      bubble.bubbleId,
      "--handoff-id",
      String(handoffId),
      "--execution-id",
      String(executionId),
      "--summary",
      "First canonical reviewer pass",
      "--no-findings"
    ]);

    const afterFirstReviewerPass = await readStateSnapshot(bubble.paths.statePath);
    const implementerHandoffId = afterFirstReviewerPass.state.execution_context?.handoff_id;
    expect(implementerHandoffId).toBeDefined();
    expect(implementerHandoffId).not.toBe(String(handoffId));
    expect(afterFirstReviewerPass.state.active_role).toBe("implementer");
    expect(afterFirstReviewerPass.state.round).toBe(2);

    await expect(
      runAgentEmitCommand([
        "--kind",
        "pass",
        "--repo",
        repoPath,
        "--bubble-id",
        bubble.bubbleId,
        "--handoff-id",
        String(handoffId),
        "--execution-id",
        String(executionId),
        "--summary",
        "Duplicate canonical reviewer pass",
        "--no-findings"
      ])
    ).rejects.toThrow(/Canonical actor emit handoff mismatch/u);

    const afterDuplicateReviewerReject = await readStateSnapshot(bubble.paths.statePath);
    expect(afterDuplicateReviewerReject.fingerprint).toBe(
      afterFirstReviewerPass.fingerprint
    );
    expect(afterDuplicateReviewerReject.state.execution_context?.handoff_id).toBe(
      implementerHandoffId
    );
    expect(afterDuplicateReviewerReject.state.active_role).toBe("implementer");
    expect(afterDuplicateReviewerReject.state.round).toBe(2);
  });

  it("rejects convergence emit when reviewer authority lacks an active reviewer agent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_agent_emit_conv_guard_01",
      task: "Canonical convergence emit"
    });
    const contextSpy = vi
      .spyOn(actorEmitContextModule, "resolveActorEmitContextByBubbleId")
      .mockResolvedValue({
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: "reviewer:b_agent_emit_conv_guard_01:round:1:attempt:1",
        execution_id: "exec_agent_emit_conv_guard_01",
        expected_role: "reviewer",
        expected_round: 1,
        expected_state_fingerprint: "fp_conv_guard_01",
        worktree_path: bubble.paths.worktreePath,
        resolved: {
          bubbleId: bubble.bubbleId,
          repoPath,
          bubblePaths: {
            statePath: bubble.paths.statePath,
            worktreePath: bubble.paths.worktreePath
          },
          bubbleConfig: bubble.config
        } as never,
        loaded_state: {
          fingerprint: "fp_conv_guard_01",
          state: {
            bubble_id: bubble.bubbleId,
            state: "RUNNING",
            round: 1,
            active_agent: null,
            active_role: "reviewer",
            execution_context: {
              handoff_id: "reviewer:b_agent_emit_conv_guard_01:round:1:attempt:1",
              execution_id: "exec_agent_emit_conv_guard_01",
              round: 1,
              active_role: "reviewer"
            }
          }
        } as never,
        execution_context: {
          handoff_id: "reviewer:b_agent_emit_conv_guard_01:round:1:attempt:1",
          execution_id: "exec_agent_emit_conv_guard_01",
          round: 1,
          active_role: "reviewer"
        } as never
      });

    await expect(
      runAgentEmitCommand([
        "--kind",
        "convergence",
        "--repo",
        repoPath,
        "--bubble-id",
        bubble.bubbleId,
        "--handoff-id",
        "reviewer:b_agent_emit_conv_guard_01:round:1:attempt:1",
        "--execution-id",
        "exec_agent_emit_conv_guard_01",
        "--summary",
        "Review converged cleanly"
      ])
    ).rejects.toThrow(
      "ACTOR_EMIT_CONTEXT_INVALID: canonical reviewer authority requires an active reviewer agent."
    );

    expect(contextSpy).toHaveBeenCalledOnce();
  });

  it("accepts canonical meta_review_result emit when recovery keeps execution context but clears live ownership", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_agent_emit_meta_recovery_01",
      task: "Canonical meta review recovery emit",
      reviewPolicy: {
        meta_review_consecutive_clean_runs_required: 1
      }
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const metaReviewExecutionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-03-24T10:34:00.000Z",
      watchdogTimeoutMinutes: 60 * 24 * 30,
      attempt: 1
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-03-24T10:34:30.000Z",
        execution_context:
          metaReviewExecutionContextToRunningContext(metaReviewExecutionContext),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: metaReviewExecutionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEWER_PANE_EXITED",
            message: "meta-reviewer pane exited after durable kickoff",
            observed_at: "2026-03-24T10:34:10.000Z",
            observed_for_handoff_id: metaReviewExecutionContext.handoff_id,
            observed_for_round: loaded.state.round
          },
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: loaded.state.state
      }
    );

    const result = await runAgentEmitCommand([
      "--kind",
      "meta_review_result",
      "--repo",
      repoPath,
      "--bubble-id",
      bubble.bubbleId,
      "--handoff-id",
      metaReviewExecutionContext.handoff_id,
      "--execution-id",
      metaReviewExecutionContext.execution_id,
      "--expected-role",
      "meta_reviewer",
      "--expected-round",
      String(loaded.state.round),
      "--summary",
      "Canonical recovery submit remains allowed.",
      "--recommendation",
      "approve",
      "--round",
      String(loaded.state.round),
      "--report-json",
      "{\"findings_claim_state\":\"clean\",\"findings_claim_source\":\"meta_review_artifact\",\"findings_count\":0}"
    ]);

    expect(result).not.toBeNull();
    expect(result?.kind).toBe("meta_review_result");
    if (result === null || result.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result.");
    }
    expect(result.meta_review_result.lifecycle_state).toBe(
      "READY_FOR_HUMAN_APPROVAL"
    );
    expect(result.meta_review_result.summary).toBe(
      "Canonical recovery submit remains allowed."
    );
    const after = await readStateSnapshot(bubble.paths.statePath);
    expect(after.state.meta_review).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: 10,
      sticky_human_gate: true,
      consecutive_clean_runs: 1,
    });
  });
});
