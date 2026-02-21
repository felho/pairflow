import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { emitPassFromWorkspace, PassCommandError } from "../../../src/core/agent/pass.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-pass-command-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupRunningBubble(repoPath: string, bubbleId: string) {
  const created = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    task: "Implement pass flow",
    cwd: repoPath
  });

  await bootstrapWorktreeWorkspace({
    repoPath,
    baseBranch: "main",
    bubbleBranch: created.config.bubble_branch,
    worktreePath: created.paths.worktreePath
  });

  const loaded = await readStateSnapshot(created.paths.statePath);
  const startedAt = "2026-02-21T12:00:00.000Z";
  await writeStateSnapshot(
    created.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 1,
      active_agent: created.config.agents.implementer,
      active_role: "implementer",
      active_since: startedAt,
      last_command_at: startedAt,
      round_role_history: [
        {
          round: 1,
          implementer: created.config.agents.implementer,
          reviewer: created.config.agents.reviewer,
          switched_at: startedAt
        }
      ]
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return created;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitPassFromWorkspace", () => {
  it("writes PASS envelope and switches active role with inferred intent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubble(repoPath, "b_pass_01");
    const now = new Date("2026-02-21T12:05:00.000Z");

    const result = await emitPassFromWorkspace({
      summary: "Implementation complete",
      refs: ["artifact://diff/round-1.patch"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.bubbleId).toBe("b_pass_01");
    expect(result.sequence).toBe(1);
    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.type).toBe("PASS");
    expect(result.envelope.round).toBe(1);
    expect(result.envelope.sender).toBe("codex");
    expect(result.envelope.recipient).toBe("claude");
    expect(result.envelope.payload.pass_intent).toBe("review");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript).toHaveLength(1);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.active_agent).toBe("claude");
    expect(loaded.state.active_role).toBe("reviewer");
    expect(loaded.state.round).toBe(1);
    expect(loaded.state.last_command_at).toBe(now.toISOString());
  });

  it("uses explicit intent override", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubble(repoPath, "b_pass_02");

    const result = await emitPassFromWorkspace({
      summary: "Please continue",
      intent: "task",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("task");
  });

  it("increments round when reviewer passes back to implementer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubble(repoPath, "b_pass_03");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const now = new Date("2026-02-21T12:07:00.000Z");
    const result = await emitPassFromWorkspace({
      summary: "Found issues to fix",
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.envelope.sender).toBe("claude");
    expect(result.envelope.recipient).toBe("codex");
    expect(result.envelope.round).toBe(1);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");

    const updated = await readStateSnapshot(bubble.paths.statePath);
    expect(updated.state.round).toBe(2);
    expect(updated.state.active_agent).toBe("codex");
    expect(updated.state.active_role).toBe("implementer");
    expect(updated.state.round_role_history.some((entry) => entry.round === 2)).toBe(true);
  });

  it("rejects pass when bubble is not running", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_pass_04",
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
      emitPassFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(PassCommandError);
  });

  it("rejects RUNNING state when round is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubble(repoPath, "b_pass_05");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 0
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Invalid round",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/round >= 1/u);
  });
});
