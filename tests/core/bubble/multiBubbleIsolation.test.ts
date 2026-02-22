import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-multi-bubble-"));
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

describe("multi-bubble isolation", () => {
  it("keeps concurrent PASS operations isolated per transcript/state", async () => {
    const repoPath = await createTempRepo();
    const bubbleA = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_iso_a",
      task: "A task"
    });
    const bubbleB = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_iso_b",
      task: "B task"
    });

    const [passA, passB] = await Promise.all([
      emitPassFromWorkspace({
        summary: "A pass",
        cwd: bubbleA.paths.worktreePath,
        now: new Date("2026-02-23T10:00:00.000Z")
      }),
      emitPassFromWorkspace({
        summary: "B pass",
        cwd: bubbleB.paths.worktreePath,
        now: new Date("2026-02-23T10:00:00.000Z")
      })
    ]);

    expect(passA.bubbleId).toBe("b_iso_a");
    expect(passB.bubbleId).toBe("b_iso_b");
    expect(passA.sequence).toBe(2);
    expect(passB.sequence).toBe(2);

    const [transcriptA, transcriptB, stateA, stateB] = await Promise.all([
      readTranscriptEnvelopes(bubbleA.paths.transcriptPath),
      readTranscriptEnvelopes(bubbleB.paths.transcriptPath),
      readStateSnapshot(bubbleA.paths.statePath),
      readStateSnapshot(bubbleB.paths.statePath)
    ]);

    expect(transcriptA.every((entry) => entry.bubble_id === bubbleA.bubbleId)).toBe(
      true
    );
    expect(transcriptB.every((entry) => entry.bubble_id === bubbleB.bubbleId)).toBe(
      true
    );
    expect(transcriptA.map((entry) => entry.type)).toEqual(["TASK", "PASS"]);
    expect(transcriptB.map((entry) => entry.type)).toEqual(["TASK", "PASS"]);

    expect(stateA.state.active_agent).toBe("claude");
    expect(stateA.state.active_role).toBe("reviewer");
    expect(stateB.state.active_agent).toBe("claude");
    expect(stateB.state.active_role).toBe("reviewer");
  });

  it("keeps concurrent HUMAN_QUESTION inbox writes isolated per bubble", async () => {
    const repoPath = await createTempRepo();
    const bubbleA = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_iso_c",
      task: "C task"
    });
    const bubbleB = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_iso_d",
      task: "D task"
    });

    await Promise.all([
      emitAskHumanFromWorkspace({
        question: "Question for C",
        cwd: bubbleA.paths.worktreePath,
        now: new Date("2026-02-23T11:00:00.000Z")
      }),
      emitAskHumanFromWorkspace({
        question: "Question for D",
        cwd: bubbleB.paths.worktreePath,
        now: new Date("2026-02-23T11:00:00.000Z")
      })
    ]);

    const [inboxA, inboxB] = await Promise.all([
      readTranscriptEnvelopes(bubbleA.paths.inboxPath, { allowMissing: true }),
      readTranscriptEnvelopes(bubbleB.paths.inboxPath, { allowMissing: true })
    ]);

    expect(inboxA).toHaveLength(1);
    expect(inboxB).toHaveLength(1);
    expect(inboxA[0]?.bubble_id).toBe("b_iso_c");
    expect(inboxB[0]?.bubble_id).toBe("b_iso_d");
    expect(inboxA[0]?.payload.question).toContain("C");
    expect(inboxB[0]?.payload.question).toContain("D");
  });
});
