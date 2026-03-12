import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { emitHumanReply, HumanReplyCommandError } from "../../../src/core/human/reply.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-human-reply-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function setupWaitingHumanBubble(repoPath: string, bubbleId: string) {
  const created = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Need human answer"
  });

  await emitAskHumanFromWorkspace({
    question: "Should we support legacy endpoint?",
    cwd: created.paths.worktreePath,
    now: new Date("2026-02-21T12:05:00.000Z")
  });

  return created;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitHumanReply", () => {
  it("writes HUMAN_REPLY and resumes WAITING_HUMAN -> RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupWaitingHumanBubble(repoPath, "b_human_reply_01");
    const now = new Date("2026-02-21T12:08:00.000Z");

    const result = await emitHumanReply({
      bubbleId: bubble.bubbleId,
      message: "Yes, keep compatibility for one release.",
      cwd: repoPath,
      now
    });

    expect(result.sequence).toBe(3);
    expect(result.envelope.type).toBe("HUMAN_REPLY");
    expect(result.envelope.sender).toBe("human");
    expect(result.envelope.recipient).toBe("codex");
    expect(result.envelope.payload.metadata).toEqual(
      expect.objectContaining({
        [deliveryTargetRoleMetadataKey]: "implementer"
      })
    );

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("RUNNING");
    expect(state.state.active_agent).toBe("codex");
    expect(state.state.active_role).toBe("implementer");
    expect(state.state.active_since).toBe("2026-02-21T12:00:00.000Z");
    expect(state.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "HUMAN_QUESTION",
      "HUMAN_REPLY"
    ]);

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox.map((entry) => entry.type)).toEqual([
      "HUMAN_QUESTION",
      "HUMAN_REPLY"
    ]);
  });

  it("emits absolute transcript fallback messageRef for HUMAN_REPLY delivery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupWaitingHumanBubble(repoPath, "b_human_reply_03");

    const deliveryRefs: string[] = [];
    const result = await emitHumanReply(
      {
        bubbleId: bubble.bubbleId,
        message: "Proceed with compatibility mode.",
        cwd: repoPath,
        now: new Date("2026-02-21T12:09:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          if (input.messageRef !== undefined) {
            deliveryRefs.push(input.messageRef);
          }
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(deliveryRefs).toEqual([
      `${bubble.paths.transcriptPath}#${result.envelope.id}`
    ]);
    expect(deliveryRefs[0]?.startsWith("transcript.ndjson#")).toBe(false);
  });

  it("derives delivery target role from active_role for shared-identity collision safety", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupWaitingHumanBubble(repoPath, "b_human_reply_04");
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "WAITING_HUMAN",
        active_agent: bubble.config.agents.implementer,
        active_role: "reviewer"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    );

    const deliveries: string[] = [];
    await emitHumanReply(
      {
        bubbleId: bubble.bubbleId,
        message: "Continue with reviewer follow-up.",
        cwd: repoPath,
        now: new Date("2026-02-21T12:10:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          deliveries.push(
            String(input.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey])
          );
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(deliveries).toEqual(["reviewer"]);
  });

  it("rejects reply when bubble is not WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_human_reply_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });

    await expect(
      emitHumanReply({
        bubbleId: bubble.bubbleId,
        message: "Ack",
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(HumanReplyCommandError);
  });
});
