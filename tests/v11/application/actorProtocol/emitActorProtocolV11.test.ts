import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveActorEmitContextByBubbleId
} from "../../../../src/v11/shared/actorProtocol/actorEmitContext.js";
import type { AgentName } from "../../../../src/types/bubble.js";
import type {
  ActorEmitContextError
} from "../../../../src/v11/shared/actorProtocol/actorEmitContext.js";
import {
  buildMetaReviewExecutionContext
} from "../../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../../src/v11/shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import * as actorProtocolModule from "../../../../src/v11/application/actorProtocol/emitActorProtocolV11.js";
import { seedConvergedCandidate } from "../converged/convergedSeedFixture.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

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

function buildInconclusiveMetaReviewReportJson(runId: string): {
  findings_claim_state: "unknown";
  findings_claim_source: "meta_review_artifact";
  findings_count: number;
  meta_review_run_id: string;
} {
  return {
    findings_claim_state: "unknown",
    findings_claim_source: "meta_review_artifact",
    findings_count: 0,
    meta_review_run_id: runId
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitActorProtocolV11 wrappers", () => {
  it("routes direct pass wrapper calls through canonical implementer authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_pass_01",
      task: "Direct implementer wrapper pass parity"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await actorProtocolModule.emitImplementerPilotActorProtocolV11({
      input: {
        kind: "pass",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        summary: "Wrapper direct pass"
      },
      authoritativeContext
    });

    expect(result.kind).toBe("pass");
    if (result.kind !== "pass") {
      throw new Error("Expected pass result.");
    }
    expect(result.pass.envelope.type).toBe("PASS");
    expect(result.pass.state.state).toBe("RUNNING");
    expect(result.pass.state.active_role).toBe("reviewer");
  });

  it("routes direct human_question wrapper calls through canonical implementer authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_human_01",
      task: "Direct implementer wrapper ask-human parity"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await actorProtocolModule.emitImplementerPilotActorProtocolV11({
      input: {
        kind: "human_question",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        question: "Need human input from direct wrapper?"
      },
      authoritativeContext
    });

    expect(result.kind).toBe("human_question");
    if (result.kind !== "human_question") {
      throw new Error("Expected human_question result.");
    }
    expect(result.human_question.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.human_question.state.state).toBe("WAITING_HUMAN");
    expect(result.human_question.delivery).toMatchObject({
      delivered: false,
      reason: "no_runtime_session",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_ABSENT"
    });
    expect(result.human_question.delivery?.message).toContain(
      "HUMAN_QUESTION codex->human"
    );
  });

  it("forwards refs on direct human_question wrapper calls", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_human_refs_01",
      task: "Direct implementer wrapper ask-human refs parity"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await actorProtocolModule.emitImplementerPilotActorProtocolV11({
      input: {
        kind: "human_question",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        question: "Need human input with refs?",
        refs: ["artifact://pilot/refs.md"]
      },
      authoritativeContext
    });

    expect(result.kind).toBe("human_question");
    if (result.kind !== "human_question") {
      throw new Error("Expected human_question result.");
    }
    expect(result.human_question.envelope.refs).toEqual([
      "artifact://pilot/refs.md"
    ]);
  });

  it("rejects direct wrapper calls when authority is not implementer via canonical actor-context error", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_reject_01",
      task: "Direct implementer wrapper role rejection"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitImplementerPilotActorProtocolV11({
        input: {
          kind: "pass",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          summary: "Should reject"
        },
        authoritativeContext: {
          ...authoritativeContext,
          expected_role: "reviewer"
        }
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
  });

  it("asserts canonical authority guards when called directly", async () => {
    await expect(
      actorProtocolModule.emitImplementerPilotActorProtocolV11({
        input: {
          kind: "human_question",
          repo: "/repo",
          bubble_id: "b_actor_protocol_01",
          handoff_id: "implementer:b_actor_protocol_01:round:2:attempt:1",
          question: "Need input"
        },
        authoritativeContext: {
          repo: "/repo",
          bubble_id: "b_actor_protocol_01",
          handoff_id: "implementer:b_actor_protocol_01:round:1:attempt:1",
          expected_role: "implementer",
          expected_round: 1,
          expected_state_fingerprint: "fp_actor_protocol_01",
          worktree_path: "/repo/.pairflow/worktrees/b_actor_protocol_01",
          resolved: {} as never,
          loaded_state: {} as never,
          execution_context: {} as never
        }
      })
    ).rejects.toThrow(/Canonical actor emit handoff mismatch/u);
  });

  it("routes direct reviewer wrapper pass calls through canonical reviewer authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_reviewer_pass_01",
      task: "Direct reviewer wrapper pass parity"
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

    const result = await actorProtocolModule.emitReviewerActorProtocolV11({
      input: {
        kind: "pass",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        summary: "Reviewer wrapper pass",
        no_findings: true
      },
      authoritativeContext
    });

    expect(result.kind).toBe("pass");
    if (result.kind !== "pass") {
      throw new Error("Expected pass result.");
    }
    expect(result.pass.envelope.type).toBe("PASS");
    expect(result.pass.state.active_role).toBe("implementer");
  });

  it("rejects direct reviewer wrapper calls when authority is not reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_reviewer_reject_01",
      task: "Direct reviewer wrapper role rejection"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitReviewerActorProtocolV11({
        input: {
          kind: "pass",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          summary: "Should reject"
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
  });

  it("rejects direct reviewer convergence wrapper calls when authority is not reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_reviewer_convergence_reject_01",
      task: "Direct reviewer convergence wrapper role rejection"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitReviewerActorProtocolV11({
        input: {
          kind: "convergence",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          summary: "Should reject reviewer convergence"
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
  });

  it("routes direct reviewer wrapper convergence calls through canonical reviewer authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_reviewer_convergence_01",
      task: "Direct reviewer wrapper convergence parity"
    });
    await seedConvergedCandidate(bubble.paths.worktreePath);
    await switchFixtureToReviewerAuthority({
      repoPath,
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      reviewer: bubble.config.agents.reviewer,
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes,
      startedAt: "2026-03-25T10:12:00.000Z"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await actorProtocolModule.emitReviewerActorProtocolV11({
      input: {
        kind: "convergence",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        summary: "Reviewer wrapper convergence",
        findings: [
          {
            severity: "P2",
            title: "Carry advisory follow-up"
          }
        ]
      },
      authoritativeContext
    });

    expect(result.kind).toBe("convergence");
    if (result.kind !== "convergence") {
      throw new Error("Expected convergence result.");
    }
    expect(result.convergence.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.convergence.approvalRequestEnvelope.type).toBe("TASK");
  });

  it("routes direct meta-review wrapper calls through canonical meta-reviewer authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_meta_review_01",
      task: "Direct meta-reviewer wrapper parity"
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await actorProtocolModule.emitMetaReviewerActorProtocolV11({
      input: {
        kind: "meta_review_result",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        round: authoritativeContext.expected_round,
        recommendation: "approve",
        summary: "Meta-review wrapper approve parity",
        report_json: buildApproveMetaReviewReportJson(
          "meta-review-wrapper-approve-parity"
        ),
        refs: ["artifacts/meta-review-last.json"]
      },
      authoritativeContext
    });

    expect(result.kind).toBe("meta_review_result");
    if (result.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result.");
    }
    expect(result.meta_review_result.gate_route).toBe("human_gate_approve");
    expect(result.meta_review_result.lifecycle_state).toBe(
      "READY_FOR_HUMAN_APPROVAL"
    );
    expect(result.meta_review_result.summary).toBe(
      "Meta-review wrapper approve parity"
    );
  });

  it("routes inconclusive meta-review wrapper calls to the human gate", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_meta_review_inconclusive_01",
      task: "Direct meta-reviewer wrapper inconclusive parity"
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await actorProtocolModule.emitMetaReviewerActorProtocolV11({
      input: {
        kind: "meta_review_result",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        round: authoritativeContext.expected_round,
        recommendation: "inconclusive",
        summary: "Meta-review wrapper inconclusive parity",
        report_json: buildInconclusiveMetaReviewReportJson(
          "meta-review-wrapper-inconclusive-parity"
        )
      },
      authoritativeContext
    });

    expect(result.kind).toBe("meta_review_result");
    if (result.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result.");
    }
    expect(result.meta_review_result.recommendation).toBe("inconclusive");
    expect(result.meta_review_result.gate_route).toBe("human_gate_inconclusive");
    expect(result.meta_review_result.gate_envelope_type).toBe("APPROVAL_REQUEST");
    expect(result.meta_review_result.lifecycle_state).toBe(
      "READY_FOR_HUMAN_APPROVAL"
    );
  });

  it("rejects direct meta-review wrapper calls when authority is not meta-reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_meta_review_reject_01",
      task: "Direct meta-reviewer wrapper role rejection"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    await expect(
      actorProtocolModule.emitMetaReviewerActorProtocolV11({
        input: {
          kind: "meta_review_result",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          round: authoritativeContext.expected_round,
          recommendation: "approve",
          summary: "Should reject meta-review authority mismatch",
          report_json: buildApproveMetaReviewReportJson(
            "meta-review-wrapper-authority-mismatch"
          )
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
  });

  it("accepts direct meta-review wrapper calls when recovery keeps execution authority but clears live ownership", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_meta_review_recovery_01",
      task: "Direct meta-reviewer wrapper recovery parity"
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath
    });
    const authoritativeContextBase = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const authoritativeContext = {
      ...authoritativeContextBase,
      loaded_state: {
        ...authoritativeContextBase.loaded_state,
        state: {
          ...authoritativeContextBase.loaded_state.state,
          active_agent: null,
          active_role: null,
          active_since: null
        }
      }
    };

    const result = await actorProtocolModule.emitMetaReviewerActorProtocolV11({
      input: {
        kind: "meta_review_result",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        round: authoritativeContext.expected_round,
        recommendation: "approve",
        summary: "Meta-review wrapper recovery parity",
        report_json: buildApproveMetaReviewReportJson(
          "meta-review-wrapper-recovery-parity"
        )
      },
      authoritativeContext
    });

    expect(result.kind).toBe("meta_review_result");
    if (result.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result.");
    }
    expect(result.meta_review_result.gate_route).toBe("human_gate_approve");
  });

  it("rejects direct meta-review wrapper calls when a non-codex live agent claims meta-review authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_meta_review_agent_reject_01",
      task: "Direct meta-reviewer wrapper agent rejection"
    });
    await switchFixtureToMetaReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath
    });
    const authoritativeContextBase = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const authoritativeContext = {
      ...authoritativeContextBase,
      loaded_state: {
        ...authoritativeContextBase.loaded_state,
        state: {
          ...authoritativeContextBase.loaded_state.state,
          active_agent: "claude" as const
        }
      }
    };

    await expect(
      actorProtocolModule.emitMetaReviewerActorProtocolV11({
        input: {
          kind: "meta_review_result",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          round: authoritativeContext.expected_round,
          recommendation: "approve",
          summary: "Should reject non-codex live meta-review authority",
          report_json: buildApproveMetaReviewReportJson(
            "meta-review-wrapper-live-agent-reject"
          )
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
  });

  it("routes implementer human_question through the Phase E wrapper from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_01",
      task: "Outer dispatcher should use implementer wrapper"
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });
    const wrapperSpy = vi.spyOn(
      actorProtocolModule.implementerPilotActorProtocolV11,
      "emit"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspaceV11({
      input: {
        kind: "human_question",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        question: "Should outer dispatcher use the wrapper?",
        refs: ["artifact://dispatch/ref.md"]
      },
      authoritativeContext
    });

    expect(wrapperSpy).toHaveBeenCalledOnce();
    expect(result.kind).toBe("human_question");
    if (result.kind !== "human_question") {
      throw new Error("Expected human_question result.");
    }
    expect(result.human_question.envelope.refs).toEqual([
      "artifact://dispatch/ref.md"
    ]);
  });

  it("routes reviewer pass through the Phase E wrapper from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_reviewer_01",
      task: "Outer dispatcher should use reviewer wrapper"
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
    const wrapperSpy = vi.spyOn(
      actorProtocolModule.reviewerActorProtocolV11,
      "emit"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspaceV11({
      input: {
        kind: "pass",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        summary: "Should outer dispatcher use the reviewer wrapper?",
        no_findings: true
      },
      authoritativeContext
    });

    expect(wrapperSpy).toHaveBeenCalledOnce();
    expect(result.kind).toBe("pass");
    if (result.kind !== "pass") {
      throw new Error("Expected pass result.");
    }
    expect(result.pass.envelope.payload.summary).toBe(
      "Should outer dispatcher use the reviewer wrapper?"
    );
  });

  it("routes reviewer convergence through the Phase E wrapper from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_reviewer_convergence_01",
      task: "Outer dispatcher should use reviewer convergence wrapper"
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
    const wrapperSpy = vi.spyOn(
      actorProtocolModule.reviewerActorProtocolV11,
      "emit"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspaceV11({
      input: {
        kind: "convergence",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        summary: "Should outer dispatcher use the reviewer convergence wrapper?",
        findings: [
          {
            severity: "P2",
            title: "Advisory follow-up"
          }
        ]
      },
      authoritativeContext
    });

    expect(wrapperSpy).toHaveBeenCalledOnce();
    expect(result.kind).toBe("convergence");
    if (result.kind !== "convergence") {
      throw new Error("Expected convergence result.");
    }
    expect(result.convergence.convergenceEnvelope.payload.summary).toBe(
      "Should outer dispatcher use the reviewer convergence wrapper?"
    );
  });

  it("routes meta_review_result through the Phase E wrapper from the outer dispatcher", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_actor_protocol_dispatch_meta_review_01",
      task: "Outer dispatcher should use meta-reviewer wrapper"
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
    const wrapperSpy = vi.spyOn(
      actorProtocolModule.metaReviewerActorProtocolV11,
      "emit"
    );

    const result = await actorProtocolModule.emitActorProtocolFromWorkspaceV11({
      input: {
        kind: "meta_review_result",
        repo: repoPath,
        bubble_id: bubble.bubbleId,
        handoff_id: authoritativeContext.handoff_id,
        round: authoritativeContext.expected_round,
        recommendation: "approve",
        summary: "Should outer dispatcher use the meta-reviewer wrapper?",
        report_json: buildApproveMetaReviewReportJson(
          "meta-review-wrapper-outer-dispatch"
        )
      },
      authoritativeContext
    });

    expect(wrapperSpy).toHaveBeenCalledOnce();
    expect(result.kind).toBe("meta_review_result");
    if (result.kind !== "meta_review_result") {
      throw new Error("Expected meta_review_result.");
    }
    expect(result.meta_review_result.summary).toBe(
      "Should outer dispatcher use the meta-reviewer wrapper?"
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
      actorProtocolModule.emitActorProtocolFromWorkspaceV11({
        input: {
          kind: "meta_review_result",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
          round: authoritativeContext.expected_round,
          recommendation: "approve",
          summary: "Should reject wrong-role outer-dispatch meta-review submit",
          report_json: buildApproveMetaReviewReportJson(
            "meta-review-wrapper-outer-dispatch-reject"
          )
        },
        authoritativeContext
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID"
    } satisfies Partial<ActorEmitContextError>);
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
      actorProtocolModule.emitActorProtocolFromWorkspaceV11({
        input: {
          kind: "pass",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
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
      actorProtocolModule.emitActorProtocolFromWorkspaceV11({
        input: {
          kind: "convergence",
          repo: repoPath,
          bubble_id: bubble.bubbleId,
          handoff_id: authoritativeContext.handoff_id,
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
