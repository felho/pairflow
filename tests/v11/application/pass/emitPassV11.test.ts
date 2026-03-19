import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  emitPassFromWorkspace,
  type EmitPassInput
} from "../../../../src/core/agent/pass.js";
import {
  emitPassFromWorkspaceV11,
  PassCommandErrorV11
} from "../../../../src/v11/application/pass/emitPassV11.js";
import { createBubble } from "../../../../src/core/bubble/createBubble.js";
import { bootstrapWorktreeWorkspace } from "../../../../src/core/workspace/worktreeManager.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-pass-v11-"));
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

async function executeSeededPass(input: {
  bubbleId: string;
  executor: (input: EmitPassInput) => ReturnType<typeof emitPassFromWorkspace>;
  includeIntent: boolean;
}) {
  const repoPath = await createTempRepo();
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId: input.bubbleId,
    task: "Pass v11 wrapper parity"
  });

  const result = await input.executor({
    summary: "Implementer handoff baseline.",
    refs: ["artifact://pass-summary.md"],
    ...(input.includeIntent ? { intent: "task" as const } : {}),
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:05:00.000Z")
  });

  return {
    envelopeType: result.envelope.type,
    envelopeSender: result.envelope.sender,
    envelopeRecipient: result.envelope.recipient,
    resultEnvelopeKind: result.resultEnvelopeKind,
    transitionDecision: result.transitionDecision,
    state: result.state.state,
    inferredIntent: result.inferredIntent,
    repeatCleanTrigger: result.repeatCleanTrigger,
    repeatCleanReasonCode: result.repeatCleanReasonCode,
    repeatCleanReasonDetail: result.repeatCleanReasonDetail,
    autoConverged: result.autoConverged
  };
}

describe("emitPassFromWorkspaceV11", () => {
  it("matches legacy pass behavior with explicit intent on seeded scenario", async () => {
    const legacy = await executeSeededPass({
      bubbleId: "b_pass_v11_legacy_explicit_01",
      executor: emitPassFromWorkspace,
      includeIntent: true
    });
    const v11 = await executeSeededPass({
      bubbleId: "b_pass_v11_v11_explicit_01",
      executor: emitPassFromWorkspaceV11,
      includeIntent: true
    });

    expect(v11).toEqual(legacy);
    expect(v11.envelopeType).toBe("PASS");
    expect(v11.envelopeSender).toBe("codex");
    expect(v11.envelopeRecipient).toBe("claude");
    expect(v11.resultEnvelopeKind).toBe("pass");
    expect(v11.transitionDecision).toBe("normal_pass");
    expect(v11.state).toBe("RUNNING");
    expect(v11.inferredIntent).toBe(false);
    expect(v11.repeatCleanTrigger).toBe(false);
    expect(v11.autoConverged).toBeUndefined();
  });

  it("matches legacy pass behavior when intent is inferred", async () => {
    const legacy = await executeSeededPass({
      bubbleId: "b_pass_v11_legacy_inferred_01",
      executor: emitPassFromWorkspace,
      includeIntent: false
    });
    const v11 = await executeSeededPass({
      bubbleId: "b_pass_v11_v11_inferred_01",
      executor: emitPassFromWorkspaceV11,
      includeIntent: false
    });

    expect(v11).toEqual(legacy);
    expect(v11.envelopeType).toBe("PASS");
    expect(v11.envelopeSender).toBe("codex");
    expect(v11.envelopeRecipient).toBe("claude");
    expect(v11.resultEnvelopeKind).toBe("pass");
    expect(v11.transitionDecision).toBe("normal_pass");
    expect(v11.state).toBe("RUNNING");
    expect(v11.inferredIntent).toBe(true);
    expect(v11.repeatCleanTrigger).toBe(false);
    expect(v11.autoConverged).toBeUndefined();
  });

  it("rejects when bubble is not RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_pass_v11_invalid_state_01",
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
      emitPassFromWorkspaceV11({
        summary: "Pass without running state",
        refs: [],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(PassCommandErrorV11);
  });
});
