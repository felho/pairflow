import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  emitConvergedFromWorkspace,
  type EmitConvergedInput
} from "../../../../src/core/agent/converged.js";
import {
  ConvergedCommandErrorV11,
  emitConvergedFromWorkspaceV11
} from "../../../../src/v11/application/converged/emitConvergedV11.js";
import { createBubble } from "../../../../src/core/bubble/createBubble.js";
import { bootstrapWorktreeWorkspace } from "../../../../src/core/workspace/worktreeManager.js";
import { initGitRepository } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { seedConvergedCandidate } from "./convergedSeedFixture.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-converged-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
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

describe("emitConvergedFromWorkspaceV11", () => {
  it("matches legacy converged behavior on the same seeded scenario", async () => {
    const legacy = await executeSeededConverged({
      bubbleId: "b_converged_v11_legacy_01",
      executor: emitConvergedFromWorkspace
    });
    const v11 = await executeSeededConverged({
      bubbleId: "b_converged_v11_v11_01",
      executor: emitConvergedFromWorkspaceV11
    });

    expect(v11).toEqual(legacy);
    expect(v11.convergenceEnvelopeType).toBe("CONVERGENCE");
    expect(v11.approvalRequestEnvelopeType).toBe("APPROVAL_REQUEST");
    expect(v11.approvalRequestRecipient).toBe("human");
    expect(v11.approvalRequestSender).toBe("orchestrator");
    expect(v11.gateRoute).toBe("human_gate_run_failed");
    expect(v11.state).toBe("META_REVIEW_FAILED");
  });

  it("matches legacy converged behavior on document-scope seeded scenario", async () => {
    const legacy = await executeSeededConverged({
      bubbleId: "b_converged_v11_legacy_doc_01",
      executor: emitConvergedFromWorkspace,
      reviewArtifactType: "document"
    });
    const v11 = await executeSeededConverged({
      bubbleId: "b_converged_v11_v11_doc_01",
      executor: emitConvergedFromWorkspaceV11,
      reviewArtifactType: "document"
    });

    expect(v11).toEqual(legacy);
    expect(v11.convergenceEnvelopeType).toBe("CONVERGENCE");
    expect(v11.approvalRequestEnvelopeType).toBe("APPROVAL_REQUEST");
    expect(v11.approvalRequestRecipient).toBe("human");
    expect(v11.approvalRequestSender).toBe("orchestrator");
    expect(v11.gateRoute).toBe("human_gate_run_failed");
    expect(v11.state).toBe("META_REVIEW_FAILED");
  });

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
      worktreePath: bubble.paths.worktreePath
    });

    await expect(
      emitConvergedFromWorkspaceV11({
        summary: "Converged without running state",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(ConvergedCommandErrorV11);
  });
});
