import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../../src/core/agent/askHuman.js";
import { readTranscriptEnvelopes } from "../../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../../src/core/state/stateStore.js";
import { deliveryTargetRoleMetadataKey } from "../../../../src/types/protocol.js";
import { emitHumanReplyV11 } from "../../../../src/v11/application/reply/emitReplyV11.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-v11-reply-delivery-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function seedWaitingHumanBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Reply delivery invariant fixture"
  });

  await emitAskHumanFromWorkspace({
    question: "Proceed with migration?",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T11:00:00.000Z")
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

describe("v11 reply delivery invariant", () => {
  it("persists HUMAN_REPLY, resumes RUNNING, and emits exactly one delivery for the emitted envelope", async () => {
    const repoPath = await createTempRepo();
    const bubble = await seedWaitingHumanBubble(
      repoPath,
      "b_reply_delivery_invariant_01"
    );
    const now = new Date("2026-03-20T11:05:00.000Z");
    const deliveries: Array<{
      bubbleId: string;
      messageRef?: string;
      envelope: {
        type: string;
        recipient: string;
        payload: {
          metadata?: Record<string, unknown>;
        };
      };
    }> = [];

    const result = await emitHumanReplyV11(
      {
        bubbleId: bubble.bubbleId,
        message: "Igen, indulhat a migration.",
        refs: [],
        repoPath,
        now
      },
      {
        emitTmuxDeliveryNotification: async (input) => {
          deliveries.push({
            bubbleId: input.bubbleId,
            ...(input.messageRef !== undefined
              ? { messageRef: input.messageRef }
              : {}),
            envelope: {
              type: input.envelope.type,
              recipient: input.envelope.recipient,
              payload: {
                ...(input.envelope.payload.metadata !== undefined
                  ? { metadata: input.envelope.payload.metadata }
                  : {})
              }
            }
          });
          return {
            delivered: true,
            message: "ok"
          };
        }
      }
    );

    expect(result.envelope.type).toBe("HUMAN_REPLY");
    expect(result.envelope.recipient).toBe(bubble.config.agents.implementer);
    expect(result.envelope.payload.metadata).toEqual(
      expect.objectContaining({
        [deliveryTargetRoleMetadataKey]: "implementer"
      })
    );

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("RUNNING");
    expect(state.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "HUMAN_QUESTION",
      "HUMAN_REPLY"
    ]);

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      bubbleId: bubble.bubbleId,
      messageRef: `${bubble.paths.transcriptPath}#${result.envelope.id}`,
      envelope: {
        type: "HUMAN_REPLY",
        recipient: bubble.config.agents.implementer,
        payload: {
          metadata: {
            [deliveryTargetRoleMetadataKey]: "implementer"
          }
        }
      }
    });
  });
});
