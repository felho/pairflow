import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../../src/core/agent/askHuman.js";
import { emitHumanReply } from "../../../../src/core/human/reply.js";
import { emitHumanReplyV11 } from "../../../../src/v11/application/reply/emitReplyV11.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-reply-facade-parity-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function seedWaitingHumanBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Reply facade parity fixture"
  });

  await emitAskHumanFromWorkspace({
    question: "Should we proceed?",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-19T22:00:00.000Z")
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

describe("v11 reply facade parity", () => {
  it("keeps reply contract parity between core facade and v11 entrypoint", async () => {
    const legacy = await createTempRepo().then(async (repoPath) => {
      const bubble = await seedWaitingHumanBubble(
        repoPath,
        "b_reply_facade_parity_legacy"
      );
      return emitHumanReply({
        bubbleId: bubble.bubbleId,
        message: "Proceed with the current plan.",
        refs: ["artifact://plan.md"],
        repoPath,
        now: new Date("2026-03-19T22:01:00.000Z")
      });
    });

    const v11 = await createTempRepo().then(async (repoPath) => {
      const bubble = await seedWaitingHumanBubble(
        repoPath,
        "b_reply_facade_parity_v11"
      );
      return emitHumanReplyV11({
        bubbleId: bubble.bubbleId,
        message: "Proceed with the current plan.",
        refs: ["artifact://plan.md"],
        repoPath,
        now: new Date("2026-03-19T22:01:00.000Z")
      });
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      envelopeType: result.envelope.type,
      sender: result.envelope.sender,
      recipient: result.envelope.recipient,
      message: result.envelope.payload.message,
      deliveryTargetRole: result.envelope.payload.metadata?.delivery_target_role,
      state: result.state.state
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      envelopeType: "HUMAN_REPLY",
      sender: "human",
      state: "RUNNING"
    });
  });
});
