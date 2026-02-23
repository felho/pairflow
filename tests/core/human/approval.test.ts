import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import {
  emitApprove,
  emitRequestRework,
  ApprovalCommandError
} from "../../../src/core/human/approval.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-approval-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupReadyForApprovalBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Implement + review"
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:03:00.000Z")
  });
  await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T12:04:00.000Z")
  });

  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("approval decisions", () => {
  it("writes APPROVAL_DECISION=approve and transitions to APPROVED_FOR_COMMIT", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForApprovalBubble(repoPath, "b_approval_01");

    const result = await emitApprove({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:00.000Z")
    });

    expect(result.envelope.type).toBe("APPROVAL_DECISION");
    expect(result.envelope.payload.decision).toBe("approve");
    expect(result.state.state).toBe("APPROVED_FOR_COMMIT");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("APPROVAL_DECISION");

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.map((entry) => entry.type)).toEqual([
      "APPROVAL_REQUEST",
      "APPROVAL_DECISION"
    ]);
  });

  it("writes APPROVAL_DECISION=revise and resumes RUNNING on implementer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForApprovalBubble(repoPath, "b_approval_02");

    const result = await emitRequestRework({
      bubbleId: bubble.bubbleId,
      message: "Please tighten validation and add edge-case tests.",
      cwd: repoPath,
      now: new Date("2026-02-22T12:05:00.000Z")
    });

    expect(result.envelope.type).toBe("APPROVAL_DECISION");
    expect(result.envelope.payload.decision).toBe("revise");
    expect(result.envelope.payload.message).toContain("tighten validation");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_agent).toBe(bubble.config.agents.implementer);
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(3);
    expect(result.state.round_role_history.some((entry) => entry.round === 3)).toBe(
      true
    );
  });

  it("rejects decision when bubble is not READY_FOR_APPROVAL", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_approval_03",
      repoPath,
      baseBranch: "main",
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
      emitApprove({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(ApprovalCommandError);
  });

  it("updates last_command_at when approving", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupReadyForApprovalBubble(repoPath, "b_approval_04");
    const now = new Date("2026-02-22T12:06:00.000Z");

    await emitApprove({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.last_command_at).toBe(now.toISOString());
  });
});
