import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { EmitPassInput } from "../../../../src/v11/application/pass/passCommandContract.js";
import {
  asPassCommandError,
  emitPassFromWorkspace,
  inferPassIntent,
  PassCommandError
} from "../../../../src/v11/application/pass/passCommandOrchestration.js";
import { WorkspaceResolutionError } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { createBubble } from "../../../../src/v11/defaults/create/createBubbleApi.js";
import { bootstrapWorktreeWorkspace } from "../../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
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
  const authorityBeforeEmit = await readStateSnapshot(bubble.paths.statePath);

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
    activation: result.activation,
    repeatCleanTrigger: result.repeatCleanTrigger,
    repeatCleanReasonCode: result.repeatCleanReasonCode,
    repeatCleanReasonDetail: result.repeatCleanReasonDetail,
    autoConverged: result.autoConverged,
    expectedActivation: {
      handoff_id: authorityBeforeEmit.state.execution_context?.handoff_id,
      execution_id: authorityBeforeEmit.state.execution_context?.execution_id,
      expected_role: authorityBeforeEmit.state.execution_context?.active_role,
      expected_round: authorityBeforeEmit.state.execution_context?.round,
      expected_state_fingerprint: authorityBeforeEmit.fingerprint
    }
  };
}

describe("emitPassFromWorkspace", () => {
  it("matches legacy pass behavior with explicit intent on seeded scenario", async () => {
    const legacy = await executeSeededPass({
      bubbleId: "b_pass_v11_explicit_01",
      executor: emitPassFromWorkspace,
      includeIntent: true
    });
    const v11 = await executeSeededPass({
      bubbleId: "b_pass_v11_explicit_01",
      executor: emitPassFromWorkspace,
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
    expect(legacy.activation).toEqual(legacy.expectedActivation);
    expect(v11.activation).toEqual(v11.expectedActivation);
    expect(v11.repeatCleanTrigger).toBe(false);
    expect(v11.autoConverged).toBeUndefined();
  });

  it("matches legacy pass behavior when intent is inferred", async () => {
    const legacy = await executeSeededPass({
      bubbleId: "b_pass_v11_inferred_01",
      executor: emitPassFromWorkspace,
      includeIntent: false
    });
    const v11 = await executeSeededPass({
      bubbleId: "b_pass_v11_inferred_01",
      executor: emitPassFromWorkspace,
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
    expect(legacy.activation).toEqual(legacy.expectedActivation);
    expect(v11.activation).toEqual(v11.expectedActivation);
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
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    await expect(
      emitPassFromWorkspace({
        summary: "Pass without running state",
        refs: [],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(PassCommandError);
  });
});

describe("asPassCommandError", () => {
  it("rethrows PassCommandError instances as-is", () => {
    const original = new PassCommandError("already normalized");
    expect(() => asPassCommandError(original)).toThrow(original);
  });

  it("maps WorkspaceResolutionError to PassCommandError", () => {
    expect(() =>
      asPassCommandError(
        new WorkspaceResolutionError("workspace lookup failed")
      )
    ).toThrowError(PassCommandError);
  });

  it("maps generic Error to PassCommandError", () => {
    expect(() => asPassCommandError(new Error("unexpected"))).toThrowError(
      PassCommandError
    );
  });

  it("rethrows non-Error values unchanged", () => {
    expect(() => asPassCommandError("raw-error")).toThrow("raw-error");
  });
});

describe("inferPassIntent", () => {
  it("returns review for implementer role", () => {
    expect(inferPassIntent("implementer")).toBe("review");
  });

  it("returns fix_request for reviewer role", () => {
    expect(inferPassIntent("reviewer")).toBe("fix_request");
  });

  it("throws PassCommandError for unsupported role", () => {
    expect(() => inferPassIntent("meta_reviewer")).toThrowError(
      PassCommandError
    );
  });
});
