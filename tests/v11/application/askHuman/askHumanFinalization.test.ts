import { describe, expect, it } from "vitest";

import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/askHumanFinalization.js";

describe("finalizeAskHumanFlow", () => {
  it("emits delivery/notification/metrics and builds ask-human command result", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];
    const appendedEnvelope = {
      id: "msg_20260221_001"
    } as never;

    const result = await finalizeAskHumanFlow(
      {
        now,
        routing: {
          question: "Need migration decision?",
          refs: ["artifact://analysis.md"],
          resolved: {
            bubbleId: "b_ask_human_01",
            repoPath: "/repo",
            bubblePaths: {
              sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_01/runtime/sessions.json"
            },
            bubbleConfig: {
              id: "b_ask_human_01"
            }
          },
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789"
          },
          state: {
            round: 2,
            active_agent: "codex",
            active_role: "implementer"
          }
        } as never,
        appended: {
          envelope: appendedEnvelope,
          sequence: 3
        } as never,
        written: {
          state: {
            state: "WAITING_HUMAN"
          }
        } as never
      },
      {
        resolveDeliveryMessageRef: (input) => {
          callOrder.push("resolveDeliveryMessageRef");
          expect(input.envelope).toBe(appendedEnvelope);
          return "transcript-ref#msg_20260221_001";
        },
        emitTmuxDeliveryNotification: async (input) => {
          callOrder.push("emitTmuxDeliveryNotification");
          expect(input.messageRef).toBe("transcript-ref#msg_20260221_001");
          return {
            delivered: true,
            message: "ok"
          };
        },
        emitBubbleNotification: async (_config, kind) => {
          callOrder.push("emitBubbleNotification");
          expect(kind).toBe("waiting-human");
          return {
            kind,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          };
        },
        emitBubbleLifecycleEventBestEffort: async (input) => {
          callOrder.push("emitBubbleLifecycleEventBestEffort");
          expect(input.actorRole).toBe("implementer");
          expect(input.metadata).toMatchObject({
            sender: "codex",
            refs_count: 1,
            question_length: 24
          });
          expect(input.now).toBe(now);
        }
      }
    );

    expect(callOrder).toEqual([
      "resolveDeliveryMessageRef",
      "emitTmuxDeliveryNotification",
      "emitBubbleNotification",
      "emitBubbleLifecycleEventBestEffort"
    ]);
    expect(result).toMatchObject({
      bubbleId: "b_ask_human_01",
      sequence: 3,
      envelope: appendedEnvelope,
      state: {
        state: "WAITING_HUMAN"
      },
      inferredRecipient: "human"
    });
  });
});
