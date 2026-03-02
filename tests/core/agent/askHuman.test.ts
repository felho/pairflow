import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace, AskHumanCommandError } from "../../../src/core/agent/askHuman.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ask-human-"));
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

describe("emitAskHumanFromWorkspace", () => {
  it("writes HUMAN_QUESTION to transcript + inbox and transitions to WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_01",
      task: "Need clarification"
    });
    const now = new Date("2026-02-21T12:10:00.000Z");

    const result = await emitAskHumanFromWorkspace({
      question: "Should we keep backwards compatibility?",
      refs: ["artifact://analysis/risk.md"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.sequence).toBe(2);
    expect(result.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.envelope.sender).toBe("codex");
    expect(result.envelope.recipient).toBe("human");
    expect(result.state.state).toBe("WAITING_HUMAN");

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("WAITING_HUMAN");
    expect(state.state.active_agent).toBe("codex");
    expect(state.state.active_role).toBe("implementer");
    expect(state.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "HUMAN_QUESTION"
    ]);

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.type).toBe("HUMAN_QUESTION");
  });

  it("emits absolute transcript fallback messageRef for HUMAN_QUESTION delivery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_03",
      task: "Need delivery fallback ref"
    });

    const deliveryRefs: string[] = [];
    const result = await emitAskHumanFromWorkspace(
      {
        question: "Need operator input",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:11:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          if (input.messageRef === undefined) {
            throw new Error("Expected messageRef for HUMAN_QUESTION delivery.");
          }
          deliveryRefs.push(input.messageRef);
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "waiting-human",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(deliveryRefs).toEqual([
      `${bubble.paths.transcriptPath}#${result.envelope.id}`
    ]);
    expect(deliveryRefs[0]?.startsWith("transcript.ndjson#")).toBe(false);
  });

  it("rejects when bubble is not RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_ask_human_02",
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
      emitAskHumanFromWorkspace({
        question: "Need human input",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(AskHumanCommandError);
  });
});
