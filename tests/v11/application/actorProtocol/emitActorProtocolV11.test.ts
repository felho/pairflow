import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveActorEmitContextByBubbleId
} from "../../../../src/core/bubble/actorEmitContext.js";
import type { AgentName } from "../../../../src/types/bubble.js";
import type {
  ActorEmitContextError
} from "../../../../src/core/bubble/actorEmitContext.js";
import { buildRunningExecutionContext } from "../../../../src/core/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../../src/core/state/stateStore.js";
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

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitImplementerPilotActorProtocolV11", () => {
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
});
