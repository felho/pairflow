import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace, ConvergedCommandError } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { readTranscriptEnvelopes, appendProtocolEnvelope } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-converged-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupConvergedCandidateBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Implement + review"
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T09:03:00.000Z")
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

describe("emitConvergedFromWorkspace", () => {
  it("writes CONVERGENCE + APPROVAL_REQUEST and moves RUNNING -> READY_FOR_APPROVAL", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_01");
    const now = new Date("2026-02-22T09:05:00.000Z");

    const result = await emitConvergedFromWorkspace({
      summary: "Two clean review passes, ready for approval.",
      refs: ["artifact://done-package.md"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.bubbleId).toBe("b_converged_01");
    expect(result.convergenceEnvelope.type).toBe("CONVERGENCE");
    expect(result.approvalRequestEnvelope.type).toBe("APPROVAL_REQUEST");
    expect(result.approvalRequestEnvelope.recipient).toBe("human");
    expect(result.state.state).toBe("READY_FOR_APPROVAL");
    expect(result.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "APPROVAL_REQUEST"
    ]);

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.map((entry) => entry.type)).toEqual(["APPROVAL_REQUEST"]);
  });

  it("rejects when active role is not reviewer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_02",
      task: "Implement"
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(ConvergedCommandError);
  });

  it("rejects when convergence alternation evidence is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_03",
      task: "Implement"
    });

    await emitPassFromWorkspace({
      summary: "Implementation pass 1",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T10:01:00.000Z")
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/alternation evidence/u);
  });

  it("rejects when unresolved human question exists in transcript", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupConvergedCandidateBubble(repoPath, "b_converged_04");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
      now: new Date("2026-02-22T10:05:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "claude",
        recipient: "human",
        type: "HUMAN_QUESTION",
        round: 2,
        payload: {
          question: "Need approval detail"
        },
        refs: []
      }
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/unresolved HUMAN_QUESTION/u);
  });

  it("rejects when previous reviewer PASS has open P0/P1 findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_converged_05",
      task: "Implement"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 2,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T11:00:00.000Z",
        last_command_at: "2026-02-22T11:00:00.000Z",
        round_role_history: [
          {
            round: 1,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:50:00.000Z"
          },
          {
            round: 2,
            implementer: bubble.config.agents.implementer,
            reviewer: bubble.config.agents.reviewer,
            switched_at: "2026-02-22T10:55:00.000Z"
          }
        ]
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:51:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Implementation pass"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      lockPath,
      now: new Date("2026-02-22T10:52:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.reviewer,
        recipient: bubble.config.agents.implementer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Review found blocker",
          findings: [
            {
              severity: "P1",
              title: "Data race risk"
            }
          ]
        },
        refs: []
      }
    });

    await expect(
      emitConvergedFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/open P0\/P1 findings/u);
  });
});
