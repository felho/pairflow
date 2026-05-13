import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertActorRuntimeDispatchPlanPolicies,
  resolveActorRuntimeDispatchPlan
} from "../../../../src/v11/application/actorProtocol/actorRuntimeDispatchMatrix.js";
import * as actorRuntimeKernelModule from "../../../../src/v11/application/actorProtocol/actorRuntimeKernel.js";
import {
  resolveActorEmitContextByBubbleId
} from "../../../../src/v11/defaults/actorProtocol/actorEmitContextDefaults.js";
import type { AgentName } from "../../../../src/contracts/kernel/agentIdentity.js";
import type {
  ActorEmitContextSnapshot,
  ActorEmitContextError
} from "../../../../src/v11/shared/actorProtocol/actorEmitContext.js";
import {
  buildMetaReviewExecutionContext
} from "../../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../../src/v11/domain/state/execution/executionContext.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import * as actorProtocolModule from "../../../../src/v11/application/actorProtocol/emitActorProtocol.js";
import { metaReviewDefaults } from "../../../../src/v11/defaults/metaReview/metaReviewDefaults.js";
import { notifyMetaReviewerSubmissionRequest } from "../../../../src/v11/defaults/metaReviewGate/metaReviewGateApi.js";
import { metaReviewGateDependencyDefaults } from "../../../../src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.js";
import { resolveMetaReviewerPaneWarning } from "../../../../src/v11/application/metaReviewGate/metaReviewGatePaneBinding.js";
import { seedConvergedCandidate } from "../converged/convergedSeedFixture.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../../helpers/stateSnapshot.js";
const tempDirs: string[] = [];
type ExecuteActorRuntimeDispatchPlanCall = Parameters<
  typeof actorRuntimeKernelModule.executeActorRuntimeDispatchPlan
>;

const metaReviewDependencies = {
  readFile,
  emitDeliveryNotification: metaReviewDefaults.emitDeliveryNotificationAck,
  buildDeliveryMessageRef: metaReviewDefaults.resolveDeliveryMessageRef,
  readRuntimeSessionsRegistry: metaReviewDefaults.readRuntimeSessionsRegistry,
  readTranscriptEnvelopes:
    metaReviewGateDependencyDefaults.readTranscriptEnvelopes,
  setMetaReviewerPaneBinding:
    metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
  notifyMetaReviewerSubmissionRequest:
    notifyMetaReviewerSubmissionRequest,
  resolveMetaReviewerPaneWarning,
  runMetaReviewApproveValidationCommand:
    metaReviewDefaults.runPassValidationCommand,
  runtime: metaReviewGateDependencyDefaults.runtime
} as const;

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-actor-protocol-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function switchFixtureToReviewerAuthority(input: {
  repoPath: string;
  bubbleId: string;
  statePath: string;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  startedAt?: string;
}): Promise<void> {
  const loaded = await readStateSnapshot(input.statePath);
  const startedAt = input.startedAt ?? "2026-03-25T10:10:00.000Z";
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

async function switchFixtureToMetaReviewerAuthority(input: {
  bubbleId: string;
  statePath: string;
  startedAt?: string;
  activeAgent?: "codex" | "claude" | null;
}): Promise<void> {
  const loaded = await readStateSnapshot(input.statePath);
  const startedAt = input.startedAt ?? "2026-03-25T10:18:00.000Z";
  const activeAgent =
    input.activeAgent === undefined ? "codex" : input.activeAgent;
  const executionContext = buildMetaReviewExecutionContext({
    bubbleId: input.bubbleId,
    round: loaded.state.round,
    startedAt,
    watchdogTimeoutMinutes: 60 * 24 * 30,
    attempt: 1
  });
  await writeStateSnapshot(
    input.statePath,
    {
      ...loaded.state,
      active_agent: activeAgent,
      active_role: activeAgent === null ? null : "meta_reviewer",
      execution_context:
        metaReviewExecutionContextToRunningContext(executionContext),
      active_since: activeAgent === null ? null : startedAt,
      last_command_at: startedAt,
      meta_review: {
        ...(loaded.state.meta_review ?? {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }),
        execution_context: executionContext
      }
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

function buildApproveMetaReviewReportJson(runId: string): {
  findings_claim_state: "clean";
  findings_claim_source: "meta_review_artifact";
  findings_count: number;
  findings_claimed_open_total: number;
  findings_blocking_open_total: number;
  findings_advisory_open_total: number;
  findings_artifact_ref: string;
  meta_review_run_id: string;
  findings_digest_sha256: string;
  findings_artifact_status: "available";
} {
  return {
    findings_claim_state: "clean",
    findings_claim_source: "meta_review_artifact",
    findings_count: 0,
    findings_claimed_open_total: 0,
    findings_blocking_open_total: 0,
    findings_advisory_open_total: 0,
    findings_artifact_ref: "artifacts/meta-review-findings-round-3.json",
    meta_review_run_id: runId,
    findings_digest_sha256:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    findings_artifact_status: "available"
  };
}

function buildSyntheticAuthoritativeContext(input: {
  repo?: string;
  bubbleId: string;
  handoffId: string;
  executionId: string;
  expectedRole: "implementer" | "reviewer" | "meta_reviewer";
  expectedRound: number;
  fingerprint: string;
  worktreePath?: string;
  activeAgent?: AgentName | null;
  metaReviewerAgent?: AgentName;
}): ActorEmitContextSnapshot {
  const repo = input.repo ?? "/repo";
  const worktreePath =
    input.worktreePath ?? `${repo}/.pairflow/worktrees/${input.bubbleId}`;
  const metaReviewerAgent = input.metaReviewerAgent ?? "codex";
  const activeAgent =
    input.activeAgent === undefined
      ? input.expectedRole === "implementer"
        ? "codex"
        : input.expectedRole === "reviewer"
          ? "claude"
          : metaReviewerAgent
      : input.activeAgent;

  return {
    repo,
    bubble_id: input.bubbleId,
    handoff_id: input.handoffId,
    execution_id: input.executionId,
    expected_role: input.expectedRole,
    expected_round: input.expectedRound,
    expected_state_fingerprint: input.fingerprint,
    worktree_path: worktreePath,
    resolved: {
      bubbleId: input.bubbleId,
      repoPath: repo,
      bubblePaths: {
        statePath: `${repo}/.pairflow/bubbles/${input.bubbleId}/state.json`,
        worktreePath
      },
      bubbleConfig: {
        id: input.bubbleId,
        agents: {
          implementer: "codex",
          reviewer: "claude",
          meta_reviewer: metaReviewerAgent
        }
      }
    } as never,
    loaded_state: {
      fingerprint: input.fingerprint,
      state: {
        bubble_id: input.bubbleId,
        state: "RUNNING",
        round: input.expectedRound,
        active_agent: activeAgent,
        active_role: activeAgent === null ? null : input.expectedRole,
        active_since:
          activeAgent === null ? null : "2026-03-25T10:00:00.000Z",
        round_role_history: [],
        last_command_at: "2026-03-25T10:00:00.000Z",
        execution_context: {
          handoff_id: input.handoffId,
          execution_id: input.executionId,
          round: input.expectedRound,
          active_role: input.expectedRole
        }
      }
    } as never,
    execution_context: {
      handoff_id: input.handoffId,
      execution_id: input.executionId,
      round: input.expectedRound,
      active_role: input.expectedRole
    } as never
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitActorProtocol runtime", () => {
  it("resolves the exact current-tree authority x input runtime routes", () => {
    const expectedRoutes = [
      {
        expectedRole: "implementer" as const,
        inputKind: "pass" as const,
        route: {
          id: "implementer_pass",
          authorityRole: "implementer",
          inputKind: "pass",
          handler: "implementer_route",
          adapter: "pass_adapter",
          routePolicy: "primary_route"
        },
        policyCheckIds: [
          "context_snapshot_integrity",
          "input_context_match",
          "implementer_authority"
        ]
      },
      {
        expectedRole: "implementer" as const,
        inputKind: "human_question" as const,
        route: {
          id: "implementer_human_question",
          authorityRole: "implementer",
          inputKind: "human_question",
          handler: "implementer_route",
          adapter: "human_question_adapter",
          routePolicy: "primary_route"
        },
        policyCheckIds: [
          "context_snapshot_integrity",
          "input_context_match",
          "implementer_authority"
        ]
      },
      {
        expectedRole: "reviewer" as const,
        inputKind: "pass" as const,
        route: {
          id: "reviewer_pass",
          authorityRole: "reviewer",
          inputKind: "pass",
          handler: "reviewer_route",
          adapter: "pass_adapter",
          routePolicy: "primary_route"
        },
        policyCheckIds: [
          "context_snapshot_integrity",
          "input_context_match",
          "reviewer_authority"
        ]
      },
      {
        expectedRole: "reviewer" as const,
        inputKind: "convergence" as const,
        route: {
          id: "reviewer_convergence",
          authorityRole: "reviewer",
          inputKind: "convergence",
          handler: "reviewer_route",
          adapter: "convergence_adapter",
          routePolicy: "primary_route"
        },
        policyCheckIds: [
          "context_snapshot_integrity",
          "input_context_match",
          "reviewer_authority"
        ]
      },
      {
        expectedRole: "reviewer" as const,
        inputKind: "human_question" as const,
        route: {
          id: "reviewer_human_question_fallback",
          authorityRole: "reviewer",
          inputKind: "human_question",
          handler: "reviewer_human_question_fallback",
          adapter: "human_question_adapter",
          routePolicy: "retained_fallback"
        },
        policyCheckIds: [
          "context_snapshot_integrity",
          "input_context_match",
          "reviewer_human_question_retained_fallback"
        ]
      },
      {
        expectedRole: "meta_reviewer" as const,
        inputKind: "meta_review_result" as const,
        route: {
          id: "meta_reviewer_meta_review_result",
          authorityRole: "meta_reviewer",
          inputKind: "meta_review_result",
          handler: "meta_reviewer_route",
          adapter: "meta_review_result_adapter",
          routePolicy: "primary_route"
        },
        policyCheckIds: [
          "context_snapshot_integrity",
          "input_context_match",
          "meta_reviewer_authority",
          "meta_reviewer_active_agent_matches_config_when_present"
        ]
      }
    ];

    for (const expectedRoute of expectedRoutes) {
      const plan = resolveActorRuntimeDispatchPlan({
        expectedRole: expectedRoute.expectedRole,
        inputKind: expectedRoute.inputKind
      });

      expect(plan.route).toMatchObject(expectedRoute.route);
      expect(plan.policyChecks.map((policyCheck) => policyCheck.id)).toEqual(
        expectedRoute.policyCheckIds
      );
    }
  });

  it("resolves the retained reviewer human_question fallback as an explicit dispatch plan", () => {
    expect(
      resolveActorRuntimeDispatchPlan({
        expectedRole: "reviewer",
        inputKind: "human_question"
      })
    ).toMatchObject({
      route: {
        id: "reviewer_human_question_fallback",
        handler: "reviewer_human_question_fallback",
        routePolicy: "retained_fallback",
        adapter: "human_question_adapter"
      },
      policyChecks: [
        {
          id: "context_snapshot_integrity",
          owner: "canonical_authority_context"
        },
        {
          id: "input_context_match",
          owner: "canonical_authority_context"
        },
        {
          id: "reviewer_human_question_retained_fallback",
          owner: "runtime_route_policy"
        }
      ]
    });
  });

  it("keeps structured dispatch error context for unsupported meta-reviewer input kinds", () => {
    expect(() =>
      resolveActorRuntimeDispatchPlan({
        expectedRole: "meta_reviewer",
        inputKind: "pass"
      })
    ).toThrowErrorMatchingInlineSnapshot(
      "[ActorEmitContextError: ACTOR_EMIT_CONTEXT_INVALID: meta_reviewer authority only supports meta_review_result emits.]"
    );

    try {
      resolveActorRuntimeDispatchPlan({
        expectedRole: "meta_reviewer",
        inputKind: "pass"
      });
      throw new Error("Expected ActorEmitContextError.");
    } catch (error) {
      expect(error).toMatchObject({
        name: "ActorEmitContextError",
        reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
        context: {
          route: "resolveActorRuntimeDispatchPlan",
          expectedAuthority: "meta_reviewer meta_review_result route",
          receivedKind: "pass"
        }
      } satisfies Partial<ActorEmitContextError>);
    }
  });

  it("keeps structured dispatch error context for unsupported implementer input kinds", () => {
    expect(() =>
      resolveActorRuntimeDispatchPlan({
        expectedRole: "implementer",
        inputKind: "convergence"
      })
    ).toThrowErrorMatchingInlineSnapshot(
      "[ActorEmitContextError: ACTOR_EMIT_CONTEXT_INVALID: implementer authority does not support convergence via outer dispatcher fallback.]"
    );

    try {
      resolveActorRuntimeDispatchPlan({
        expectedRole: "implementer",
        inputKind: "convergence"
      });
      throw new Error("Expected ActorEmitContextError.");
    } catch (error) {
      expect(error).toMatchObject({
        name: "ActorEmitContextError",
        reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
        context: {
          route: "resolveActorRuntimeDispatchPlan",
          expectedAuthority: "implementer authority route",
          receivedKind: "convergence"
        }
      } satisfies Partial<ActorEmitContextError>);
    }
  });

  it("keeps structured dispatch error context for unsupported reviewer input kinds", () => {
    expect(() =>
      resolveActorRuntimeDispatchPlan({
        expectedRole: "reviewer",
        inputKind: "meta_review_result"
      })
    ).toThrowErrorMatchingInlineSnapshot(
      "[ActorEmitContextError: ACTOR_EMIT_CONTEXT_INVALID: reviewer authority does not support meta_review_result via outer dispatcher fallback.]"
    );

    try {
      resolveActorRuntimeDispatchPlan({
        expectedRole: "reviewer",
        inputKind: "meta_review_result"
      });
      throw new Error("Expected ActorEmitContextError.");
    } catch (error) {
      expect(error).toMatchObject({
        name: "ActorEmitContextError",
        reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
        context: {
          route: "resolveActorRuntimeDispatchPlan",
          expectedAuthority: "reviewer human_question baseline",
          receivedKind: "meta_review_result"
        }
      } satisfies Partial<ActorEmitContextError>);
    }
  });

  it("enforces reviewer authority from the dispatch plan policy checks", () => {
    const actorInput = {
      kind: "pass",
      repo: "/repo",
      bubble_id: "b_actor_protocol_policy_reviewer_01",
      handoff_id: "reviewer:b_actor_protocol_policy_reviewer_01:round:2:attempt:1",
      execution_id: "exec_actor_protocol_policy_reviewer_01",
      summary: "Dispatch-plan policy enforcement should require reviewer agent",
      no_findings: true
    } as const;
    const authoritativeContext = buildSyntheticAuthoritativeContext({
      bubbleId: actorInput.bubble_id,
      handoffId: actorInput.handoff_id,
      executionId: actorInput.execution_id,
      expectedRole: "reviewer",
      expectedRound: 2,
      fingerprint: "fp_actor_protocol_policy_reviewer_01",
      activeAgent: null
    });
    const plan = resolveActorRuntimeDispatchPlan({
      expectedRole: authoritativeContext.expected_role,
      inputKind: actorInput.kind
    });

    expect(() =>
      assertActorRuntimeDispatchPlanPolicies({
        plan,
        actorInput,
        authoritativeContext
      })
    ).toThrowErrorMatchingInlineSnapshot(
      "[ActorEmitContextError: ACTOR_EMIT_CONTEXT_INVALID: canonical reviewer authority requires an active reviewer agent.]"
    );
  });

  it("enforces meta-review active-agent policy from the dispatch plan policy checks", () => {
    const actorInput = {
      kind: "meta_review_result",
      repo: "/repo",
      bubble_id: "b_actor_protocol_policy_meta_01",
      handoff_id: "meta_review:b_actor_protocol_policy_meta_01:round:2:attempt:1",
      execution_id: "exec_actor_protocol_policy_meta_01",
      round: 2,
      recommendation: "approve",
      summary: "Dispatch-plan policy enforcement should require codex when active_agent is present",
      report_json: buildApproveMetaReviewReportJson(
        "meta-review-policy-enforcement"
      )
    } as const;
    const authoritativeContext = buildSyntheticAuthoritativeContext({
      bubbleId: actorInput.bubble_id,
      handoffId: actorInput.handoff_id,
      executionId: actorInput.execution_id,
      expectedRole: "meta_reviewer",
      expectedRound: 2,
      fingerprint: "fp_actor_protocol_policy_meta_01",
      activeAgent: "claude"
    });
    const plan = resolveActorRuntimeDispatchPlan({
      expectedRole: authoritativeContext.expected_role,
      inputKind: actorInput.kind
    });

    expect(() =>
      assertActorRuntimeDispatchPlanPolicies({
        plan,
        actorInput,
        authoritativeContext
      })
    ).toThrowErrorMatchingInlineSnapshot(
      "[ActorEmitContextError: ACTOR_EMIT_CONTEXT_INVALID: canonical meta-reviewer authority requires the configured meta-reviewer agent when active_agent is present (active_agent=claude, configured=codex).]"
    );
  });

  it("accepts a configured non-default meta-reviewer agent in dispatch plan policies", () => {
    const actorInput = {
      kind: "meta_review_result",
      repo: "/repo",
      bubble_id: "b_actor_protocol_policy_meta_claude_01",
      handoff_id:
        "meta_review:b_actor_protocol_policy_meta_claude_01:round:2:attempt:1",
      execution_id: "exec_actor_protocol_policy_meta_claude_01",
      round: 2,
      recommendation: "approve",
      summary:
        "Dispatch-plan policy enforcement should accept configured claude ownership",
      report_json: buildApproveMetaReviewReportJson(
        "meta-review-policy-enforcement-claude"
      )
    } as const;
    const authoritativeContext = buildSyntheticAuthoritativeContext({
      bubbleId: actorInput.bubble_id,
      handoffId: actorInput.handoff_id,
      executionId: actorInput.execution_id,
      expectedRole: "meta_reviewer",
      expectedRound: 2,
      fingerprint: "fp_actor_protocol_policy_meta_claude_01",
      metaReviewerAgent: "claude"
    });
    const plan = resolveActorRuntimeDispatchPlan({
      expectedRole: authoritativeContext.expected_role,
      inputKind: actorInput.kind
    });

    expect(() =>
      assertActorRuntimeDispatchPlanPolicies({
        plan,
        actorInput,
        authoritativeContext
      })
    ).not.toThrow();
  });

  it("routes implementer human_question through the shared runtime kernel from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_01",
      task: "Outer dispatcher should use implementer route"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const kernelSpy = vi.spyOn(
      actorRuntimeKernelModule,
      "executeActorRuntimeDispatchPlan"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspace({
      input: {
        kind: "human_question",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
        question: "Should outer dispatcher use the implementer route?",
        refs: ["artifact://dispatch/ref.md"]
      },
      authoritativeContext
    });

    expect(kernelSpy).toHaveBeenCalledOnce();
    const [kernelInput] =
      kernelSpy.mock.calls[0] as ExecuteActorRuntimeDispatchPlanCall;
    expect(kernelInput.plan.route.id).toBe("implementer_human_question");
    expect(kernelInput.authoritativeContext).toBe(authoritativeContext);
    expect(kernelInput.actorInput).toMatchObject({
      kind: "human_question",
      bubble_id: bubble.bubbleId,
      handoff_id: authoritativeContext.handoff_id,
      execution_id: authoritativeContext.execution_id
    });
    expect(result.kind).toBe("human_question");
    if (result.kind !== "human_question") {
      throw new Error("Expected human_question result.");
    }
    expect(result.human_question.envelope.refs).toEqual([
      "artifact://dispatch/ref.md"
    ]);
  });

  it("preserves reviewer human_question via the retained kernel-backed outer-dispatch baseline", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_reviewer_human_01",
      task: "Outer dispatcher should preserve reviewer human_question baseline"
    });
    await switchFixtureToReviewerAuthority({
      repoPath,
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      reviewer: bubble.config.agents.reviewer,
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const kernelSpy = vi.spyOn(
      actorRuntimeKernelModule,
      "executeActorRuntimeDispatchPlan"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspace({
      input: {
        kind: "human_question",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
        question: "Should reviewer human_question baseline stay available?",
        refs: ["artifact://dispatch/reviewer-human.md"]
      },
      authoritativeContext
    });

    expect(kernelSpy).toHaveBeenCalledOnce();
    const [kernelInput] =
      kernelSpy.mock.calls[0] as ExecuteActorRuntimeDispatchPlanCall;
    expect(kernelInput.plan.route.id).toBe(
      "reviewer_human_question_fallback"
    );
    expect(kernelInput.plan.route.routePolicy).toBe("retained_fallback");
    expect(result.kind).toBe("human_question");
    if (result.kind !== "human_question") {
      throw new Error("Expected human_question result.");
    }
    expect(result.human_question.envelope.refs).toEqual([
      "artifact://dispatch/reviewer-human.md"
    ]);
    expect(result.human_question.state.state).toBe("WAITING_HUMAN");
  });

  it("routes reviewer pass through the shared runtime kernel from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_reviewer_01",
      task: "Outer dispatcher should use reviewer route"
    });
    await switchFixtureToReviewerAuthority({
      repoPath,
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      reviewer: bubble.config.agents.reviewer,
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const kernelSpy = vi.spyOn(
      actorRuntimeKernelModule,
      "executeActorRuntimeDispatchPlan"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspace({
      input: {
        kind: "pass",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
        summary: "Should outer dispatcher use the reviewer route?",
        no_findings: true
      },
      authoritativeContext
    });

    expect(kernelSpy).toHaveBeenCalledOnce();
    const [kernelInput] =
      kernelSpy.mock.calls[0] as ExecuteActorRuntimeDispatchPlanCall;
    expect(kernelInput.plan.route.id).toBe("reviewer_pass");
    expect(kernelInput.authoritativeContext).toBe(authoritativeContext);
    expect(kernelInput.actorInput).toMatchObject({
      kind: "pass",
      bubble_id: bubble.bubbleId,
      handoff_id: authoritativeContext.handoff_id,
      execution_id: authoritativeContext.execution_id
    });
    expect(result.kind).toBe("pass");
    if (result.kind !== "pass") {
      throw new Error("Expected pass result.");
    }
    expect(result.pass.envelope.payload.summary).toBe(
      "Should outer dispatcher use the reviewer route?"
    );
  });

  it("routes reviewer convergence through the shared runtime kernel from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_reviewer_convergence_01",
      task: "Outer dispatcher should use reviewer convergence route"
    });
    await seedConvergedCandidate(bubble.paths.worktreePath);
    await switchFixtureToReviewerAuthority({
      repoPath,
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      reviewer: bubble.config.agents.reviewer,
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes,
      startedAt: "2026-03-25T10:15:00.000Z"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const kernelSpy = vi.spyOn(
      actorRuntimeKernelModule,
      "executeActorRuntimeDispatchPlan"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspace({
      input: {
        kind: "convergence",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
        summary: "Should outer dispatcher use the reviewer convergence route?",
        findings: [
          {
            severity: "P2",
            title: "Advisory follow-up"
          }
        ]
      },
      authoritativeContext
    });

    expect(kernelSpy).toHaveBeenCalledOnce();
    const [kernelInput] =
      kernelSpy.mock.calls[0] as ExecuteActorRuntimeDispatchPlanCall;
    expect(kernelInput.plan.route.id).toBe("reviewer_convergence");
    expect(kernelInput.authoritativeContext).toBe(authoritativeContext);
    expect(kernelInput.actorInput).toMatchObject({
      kind: "convergence",
      bubble_id: bubble.bubbleId,
      handoff_id: authoritativeContext.handoff_id,
      execution_id: authoritativeContext.execution_id
    });
    expect(result.kind).toBe("convergence");
    if (result.kind !== "convergence") {
      throw new Error("Expected convergence result.");
    }
    expect(result.convergence.convergenceEnvelope.payload.summary).toBe(
      "Should outer dispatcher use the reviewer convergence route?"
    );
  });

  it("routes meta_review_result through the shared runtime kernel from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_meta_review_01",
      task: "Outer dispatcher should use meta-review route",
      reviewPolicy: {
        meta_review_consecutive_clean_runs_required: 1
      }
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      startedAt: "2026-03-25T10:20:00.000Z"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const kernelSpy = vi.spyOn(
      actorRuntimeKernelModule,
      "executeActorRuntimeDispatchPlan"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspace({
      input: {
        kind: "meta_review_result",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
        round: authoritativeContext.expected_round,
        recommendation: "approve",
        summary: "Should outer dispatcher use the meta-review route?",
        report_json: buildApproveMetaReviewReportJson(
          "meta-review-route-outer-dispatch"
        )
      },
      authoritativeContext
    }, {
      metaReview: metaReviewDependencies
    });

    expect(kernelSpy).toHaveBeenCalledOnce();
    const [kernelInput] =
      kernelSpy.mock.calls[0] as ExecuteActorRuntimeDispatchPlanCall;
    expect(kernelInput.authoritativeContext).toBe(authoritativeContext);
    expect(kernelInput.plan.route.id).toBe(
      "meta_reviewer_meta_review_result"
    );
    expect(kernelInput.actorInput).toMatchObject({
      kind: "meta_review_result",
      bubble_id: bubble.bubbleId,
      handoff_id: authoritativeContext.handoff_id,
      execution_id: authoritativeContext.execution_id
    });
    expect(result.kind).toBe("meta_review_result");
    if (result.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result.");
    }
    expect(result.meta_review_result.summary).toBe(
      "Should outer dispatcher use the meta-review route?"
    );
    expect(result.meta_review_result.gate_route).toBe("human_gate_approve");
  });

  it("rejects meta_review_result from the outer dispatcher when authority is not meta-reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_meta_review_reject_01",
      task: "Outer dispatcher should reject wrong-role meta-review emits"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "meta_review_result",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
          round: authoritativeContext.expected_round,
          recommendation: "approve",
          summary: "Should reject wrong-role outer-dispatch meta-review submit",
          report_json: buildApproveMetaReviewReportJson(
            "meta-review-route-outer-dispatch-reject"
          )
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
  });

  it("rejects reviewer pass from the outer dispatcher when active reviewer authority is missing", async () => {
    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "pass",
          repo: "/repo",
          bubble_id: "b_actor_protocol_dispatch_reviewer_missing_agent_01",
          handoff_id: "reviewer:b_actor_protocol_dispatch_reviewer_missing_agent_01:round:2:attempt:1",
          execution_id: "exec_actor_protocol_dispatch_reviewer_missing_agent_01",
          summary: "Outer dispatcher should enforce active reviewer authority",
          no_findings: true
        },
        authoritativeContext: buildSyntheticAuthoritativeContext({
          bubbleId: "b_actor_protocol_dispatch_reviewer_missing_agent_01",
          handoffId: "reviewer:b_actor_protocol_dispatch_reviewer_missing_agent_01:round:2:attempt:1",
          executionId: "exec_actor_protocol_dispatch_reviewer_missing_agent_01",
          expectedRole: "reviewer",
          expectedRound: 2,
          fingerprint: "fp_actor_protocol_dispatch_reviewer_missing_agent_01",
          activeAgent: null
        }) as never
      })
    ).rejects.toThrow(
      /canonical reviewer authority requires an active reviewer agent/u
    );
  });

  it("rejects pass from the outer dispatcher when authority is meta-reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_meta_review_pass_reject_01",
      task: "Outer dispatcher should reject pass under meta-reviewer authority"
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      startedAt: "2026-03-25T10:21:00.000Z"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "pass",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
          summary: "Should reject pass under meta-reviewer authority"
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_CONTEXT_INVALID: meta_reviewer authority only supports meta_review_result emits."
    } satisfies Partial<ActorEmitContextError>);
  });

  it("rejects meta_review_result from the outer dispatcher when a non-configured live agent claims meta-review authority", async () => {
    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "meta_review_result",
          repo: "/repo",
          bubble_id: "b_actor_protocol_dispatch_meta_review_non_codex_01",
          handoff_id: "meta_review:b_actor_protocol_dispatch_meta_review_non_codex_01:round:2:attempt:1",
          execution_id: "exec_actor_protocol_dispatch_meta_review_non_codex_01",
          round: 2,
          recommendation: "approve",
          summary: "Outer dispatcher should enforce configured live meta-review authority",
          report_json: buildApproveMetaReviewReportJson(
            "meta-review-outer-dispatch-live-agent-reject"
          )
        },
        authoritativeContext: buildSyntheticAuthoritativeContext({
          bubbleId: "b_actor_protocol_dispatch_meta_review_non_codex_01",
          handoffId: "meta_review:b_actor_protocol_dispatch_meta_review_non_codex_01:round:2:attempt:1",
          executionId: "exec_actor_protocol_dispatch_meta_review_non_codex_01",
          expectedRole: "meta_reviewer",
          expectedRound: 2,
          fingerprint: "fp_actor_protocol_dispatch_meta_review_non_codex_01",
          activeAgent: "claude"
        }) as never
      })
    ).rejects.toThrow(
      /canonical meta-reviewer authority requires the configured meta-reviewer agent when active_agent is present/u
    );
  });

  it("rejects convergence from the outer dispatcher when authority is implementer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_impl_convergence_reject_01",
      task: "Outer dispatcher should reject convergence under implementer authority"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "convergence",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          execution_id: authoritativeContext.execution_id,
          summary: "Should reject convergence under implementer authority"
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_CONTEXT_INVALID: implementer authority does not support convergence via outer dispatcher fallback."
    } satisfies Partial<ActorEmitContextError>);
  });

  it("preserves canonical context mismatch precedence before unsupported-route rejection in the outer dispatcher", async () => {
    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "convergence",
          repo: "/repo",
          bubble_id: "b_actor_protocol_dispatch_ordering_01",
          handoff_id: "implementer:b_actor_protocol_dispatch_ordering_01:round:2:attempt:1",
          execution_id: "exec_actor_protocol_dispatch_ordering_01_input",
          summary: "Unsupported routes must not mask canonical execution mismatch"
        },
        authoritativeContext: buildSyntheticAuthoritativeContext({
          bubbleId: "b_actor_protocol_dispatch_ordering_01",
          handoffId: "implementer:b_actor_protocol_dispatch_ordering_01:round:2:attempt:1",
          executionId: "exec_actor_protocol_dispatch_ordering_01_context",
          expectedRole: "implementer",
          expectedRound: 2,
          fingerprint: "fp_actor_protocol_dispatch_ordering_01"
        }) as never
      })
    ).rejects.toThrow(/Canonical actor emit execution mismatch/u);
  });

  it("rejects convergence from the outer dispatcher when authority is meta-reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_meta_review_convergence_reject_01",
      task: "Outer dispatcher should reject convergence under meta-reviewer authority"
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      startedAt: "2026-03-25T10:22:00.000Z"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitActorProtocolFromWorkspace({
        input: {
          kind: "convergence",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
        execution_id: authoritativeContext.execution_id,
          summary: "Should reject convergence under meta-reviewer authority"
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_CONTEXT_INVALID: meta_reviewer authority only supports meta_review_result emits."
    } satisfies Partial<ActorEmitContextError>);
  });
});
