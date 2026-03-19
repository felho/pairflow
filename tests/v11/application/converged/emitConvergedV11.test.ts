import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  emitConvergedFromWorkspace,
  type EmitConvergedInput
} from "../../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../../src/core/agent/pass.js";
import {
  ConvergedCommandErrorV11,
  emitConvergedFromWorkspaceV11
} from "../../../../src/v11/application/converged/emitConvergedV11.js";
import { createBubble } from "../../../../src/core/bubble/createBubble.js";
import { bootstrapWorktreeWorkspace } from "../../../../src/core/workspace/worktreeManager.js";
import { initGitRepository } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";

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

async function seedConvergedCandidate(cwd: string): Promise<void> {
  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd,
    now: new Date("2026-02-22T09:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd,
    now: new Date("2026-02-22T09:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd,
    now: new Date("2026-02-22T09:03:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 2 findings",
    findings: [
      {
        severity: "P2",
        title: "Round-2 non-blocking follow-up"
      }
    ],
    cwd,
    now: new Date("2026-02-22T09:03:10.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 3",
    cwd,
    now: new Date("2026-02-22T09:03:20.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 3 clean",
    noFindings: true,
    cwd,
    now: new Date("2026-02-22T09:03:30.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 4",
    cwd,
    now: new Date("2026-02-22T09:03:40.000Z")
  });
}

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
