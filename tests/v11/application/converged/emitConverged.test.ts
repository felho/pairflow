import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveActorEmitContextByBubbleId } from "../../../../src/v11/defaults/actorProtocol/actorEmitContextDefaults.js";
import type { AgentName } from "../../../../src/contracts/kernel/agentIdentity.js";
import { buildRunningExecutionContext } from "../../../../src/v11/domain/state/execution/executionContext.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import {
  ConvergedCommandError,
  emitConvergedFromWorkspaceCommandOrchestration,
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace,
  type EmitConvergedInput
} from "../../../../src/v11/application/converged/convergedCommandOrchestration.js";
import { createBubble } from "../../../../src/v11/defaults/create/createBubbleApi.js";
import { bootstrapWorktreeWorkspace } from "../../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { seedConvergedCandidate } from "./convergedSeedFixture.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../../helpers/stateSnapshot.js";
const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-converged-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function switchFixtureToReviewerAuthority(input: {
  bubbleId: string;
  statePath: string;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
}): Promise<void> {
  const loaded = await readStateSnapshot(input.statePath);
  const startedAt = "2026-02-22T09:04:00.000Z";
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

async function executeSeededConverged(input: {
  bubbleId: string;
  executor: (input: EmitConvergedInput) => ReturnType<typeof emitConvergedFromWorkspace>;
  reviewArtifactType?: "code" | "document";
}) {
  const repoPath = await createTempRepo();
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId: input.bubbleId,
    task: "Converged v11 wrapper parity",
    ...(input.reviewArtifactType !== undefined
      ? { reviewArtifactType: input.reviewArtifactType }
      : {})
  });
  await seedConvergedCandidate(bubble.paths.worktreePath);

  const result = await input.executor({
    summary: "Two clean review passes, ready for approval.",
    refs: ["artifact://done-package.md"],
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:05:00.000Z")
  });

  return {
    convergenceEnvelopeType: result.convergenceEnvelope.type,
    approvalRequestEnvelopeType: result.approvalRequestEnvelope.type,
    approvalRequestRecipient: result.approvalRequestEnvelope.recipient,
    approvalRequestSender: result.approvalRequestEnvelope.sender,
    gateRoute: result.gateRoute,
    state: result.state.state
  };
}

describe("emitConvergedFromWorkspaceCommandOrchestration", () => {
  it(
    "matches legacy converged behavior on the same seeded scenario",
    { timeout: 15_000 },
    async () => {
    const legacy = await executeSeededConverged({
      bubbleId: "b_converged_v11_legacy_01",
      executor: emitConvergedFromWorkspace
    });
    const v11 = await executeSeededConverged({
      bubbleId: "b_converged_v11_v11_01",
      executor: emitConvergedFromWorkspaceCommandOrchestration
    });

    expect(v11).toEqual(legacy);
    expect(v11.convergenceEnvelopeType).toBe("CONVERGENCE");
    expect(v11.approvalRequestEnvelopeType).toBe("TASK");
    expect(v11.approvalRequestRecipient).toBe("codex");
    expect(v11.approvalRequestSender).toBe("orchestrator");
    expect(v11.gateRoute).toBe("meta_review_running");
    expect(v11.state).toBe("RUNNING");
    }
  );

  it(
    "matches legacy converged behavior on document-scope seeded scenario",
    { timeout: 15_000 },
    async () => {
    const legacy = await executeSeededConverged({
      bubbleId: "b_converged_v11_legacy_doc_01",
      executor: emitConvergedFromWorkspace,
      reviewArtifactType: "document"
    });
    const v11 = await executeSeededConverged({
      bubbleId: "b_converged_v11_v11_doc_01",
      executor: emitConvergedFromWorkspaceCommandOrchestration,
      reviewArtifactType: "document"
    });

    expect(v11).toEqual(legacy);
    expect(v11.convergenceEnvelopeType).toBe("CONVERGENCE");
    expect(v11.approvalRequestEnvelopeType).toBe("TASK");
    expect(v11.approvalRequestRecipient).toBe("codex");
    expect(v11.approvalRequestSender).toBe("orchestrator");
    expect(v11.gateRoute).toBe("meta_review_running");
    expect(v11.state).toBe("RUNNING");
    }
  );

  it("rejects when bubble is not RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_converged_v11_invalid_state_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });
    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    await expect(
      emitConvergedFromWorkspaceCommandOrchestration({
        summary: "Converged without running state",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(ConvergedCommandError);
  });

  it("accepts authoritative reviewer context without relying on cwd resolution", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_v11_authority_01",
      task: "Converged v11 authoritative context parity"
    });
    await seedConvergedCandidate(bubble.paths.worktreePath);
    await switchFixtureToReviewerAuthority({
      bubbleId: bubble.bubbleId,
      statePath: bubble.paths.statePath,
      reviewer: bubble.config.agents.reviewer,
      watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
    });
    const authoritativeContext = await resolveActorEmitContextByBubbleId({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const result = await emitConvergedFromWorkspaceCommandOrchestration({
      summary: "Reviewer convergence via authoritative context.",
      refs: ["artifact://done-package.md"],
      authoritativeContext,
      cwd: "/repo/should/not/be/resolved",
      now: new Date("2026-02-22T09:05:00.000Z")
    });

    expect(result.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.approvalRequestEnvelope.type).toBe("TASK");
    expect(result.state.state).toBe("RUNNING");
  });
});
