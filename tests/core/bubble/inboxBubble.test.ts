import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { getBubbleInbox } from "../../../src/core/bubble/inboxBubble.js";
import { appendProtocolEnvelope } from "../../../src/core/protocol/transcriptStore.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-bubble-inbox-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
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

describe("getBubbleInbox", () => {
  it("returns only unresolved HUMAN_QUESTION and APPROVAL_REQUEST items", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_inbox_01",
      repoPath,
      baseBranch: "main",
      task: "Inbox task",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:00:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "codex",
        recipient: "human",
        type: "HUMAN_QUESTION",
        round: 1,
        payload: {
          question: "Question 1?"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:01:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "human",
        recipient: "codex",
        type: "HUMAN_REPLY",
        round: 1,
        payload: {
          message: "Answer 1."
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:02:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "claude",
        recipient: "human",
        type: "HUMAN_QUESTION",
        round: 2,
        payload: {
          question: "Question 2?"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:03:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "claude",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 2,
        payload: {
          summary: "Approve pass A"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:04:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "human",
        recipient: "claude",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "approve"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:05:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "claude",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 3,
        payload: {
          summary: "Approve pass B"
        },
        refs: []
      }
    });

    const view = await getBubbleInbox({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(view.state).toBe("CREATED");
    expect(view.pending).toEqual({
      humanQuestions: 1,
      approvalRequests: 1,
      total: 2
    });
    expect(view.items.map((item) => item.type)).toEqual([
      "HUMAN_QUESTION",
      "APPROVAL_REQUEST"
    ]);
    expect(view.items[0]?.summary).toBe("Question 2?");
    expect(view.items[1]?.summary).toBe("Approve pass B");
  });

  it("clamps out-of-order reply/decision events to zero pending", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_inbox_02",
      repoPath,
      baseBranch: "main",
      task: "Inbox task",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:10:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "human",
        recipient: "codex",
        type: "HUMAN_REPLY",
        round: 1,
        payload: {
          message: "No question yet."
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:11:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "human",
        recipient: "claude",
        type: "APPROVAL_DECISION",
        round: 1,
        payload: {
          decision: "revise"
        },
        refs: []
      }
    });

    const view = await getBubbleInbox({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });
    expect(view.pending.total).toBe(0);
    expect(view.items).toHaveLength(0);
  });
});
