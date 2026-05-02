import { describe, expect, it } from "vitest";

import { buildAskHumanFinalizationLifecycleEventInput } from "../../../../src/v11/application/askHuman/askHumanFinalizationLifecycleEventInputBuilder.js";

describe("askHumanFinalizationLifecycleEventInputBuilder", () => {
  it("builds lifecycle metric event input from finalization context", () => {
    const now = new Date("2026-03-20T10:45:00.000Z");

    const lifecycleEventInput = buildAskHumanFinalizationLifecycleEventInput({
      now,
      routing: {
        question: "Need migration decision?",
        refs: ["artifact://analysis.md"],
        resolved: {
          repoPath: "/repo",
          bubbleId: "b_ask_human_01"
        },
        bubbleIdentity: {
          bubbleInstanceId: "bi_1234567890_abcdef0123456789"
        },
        state: {
          round: 2,
          active_role: "implementer",
          active_agent: "codex"
        }
      }
    } as never);

    expect(lifecycleEventInput).toMatchObject({
      repoPath: "/repo",
      bubbleId: "b_ask_human_01",
      bubbleInstanceId: "bi_1234567890_abcdef0123456789",
      eventType: "bubble_asked_human",
      round: 2,
      actorRole: "implementer",
      now,
      metadata: {
        sender: "codex",
        refs_count: 1,
        question_length: 24
      }
    });
  });
});
