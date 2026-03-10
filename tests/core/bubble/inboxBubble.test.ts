import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { getBubbleInbox } from "../../../src/core/bubble/inboxBubble.js";
import { appendProtocolEnvelope } from "../../../src/core/protocol/transcriptStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
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
      reviewArtifactType: "code",
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
      reviewArtifactType: "code",
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

  it("keeps only the latest unresolved approval request as pending", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_inbox_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Inbox latest approval",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:12:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 1,
        payload: {
          summary: "Older approval summary"
        },
        refs: []
      }
    });
    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:13:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 1,
        payload: {
          summary: "Latest approval summary"
        },
        refs: []
      }
    });

    const view = await getBubbleInbox({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(view.pending.approvalRequests).toBe(1);
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.summary).toBe("Latest approval summary");
  });

  it("surfaces newer meta-review snapshot summary as the canonical pending approval item", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_inbox_04",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Inbox canonical snapshot",
      cwd: repoPath
    });
    const lockPath = join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`);

    await appendProtocolEnvelope({
      transcriptPath: bubble.paths.transcriptPath,
      mirrorPaths: [bubble.paths.inboxPath],
      lockPath,
      now: new Date("2026-02-22T10:14:00.000Z"),
      envelope: {
        bubble_id: bubble.bubbleId,
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        round: 1,
        payload: {
          summary: "META_REVIEW_GATE_RUN_FAILED: stale timeout"
        },
        refs: []
      }
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 1,
        meta_review: {
          ...loaded.state.meta_review!,
          last_autonomous_run_id: "run_meta_newer",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Fresh approve summary",
          last_autonomous_report_ref: "artifacts/meta-review-last.md",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-02-22T10:15:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint
      }
    );

    const view = await getBubbleInbox({
      bubbleId: bubble.bubbleId,
      cwd: repoPath
    });

    expect(view.pending.approvalRequests).toBe(1);
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.summary).toBe("Fresh approve summary");
    expect(view.items[0]?.envelopeId).toContain("meta_review_snapshot:");
  });
});
