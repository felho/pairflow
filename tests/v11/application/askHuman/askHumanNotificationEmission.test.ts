import { describe, expect, it } from "vitest";

import { emitOptionalAskHumanNotifications } from "../../../../src/v11/shared/askHuman/askHumanNotificationEmission.js";

describe("askHumanNotificationEmission", () => {
  it("emits optional tmux delivery and bubble notification signals", () => {
    const calls: string[] = [];

    emitOptionalAskHumanNotifications(
      {
        bubbleId: "b_ask_human_01",
        bubbleConfig: {
          id: "b_ask_human_01"
        } as never,
        sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_01/runtime/sessions.json",
        envelope: {
          id: "msg_20260221_001"
        } as never,
        messageRef: "transcript-ref#msg_20260221_001"
      },
      {
        emitTmuxDeliveryNotification: async (input) => {
          calls.push("emitTmuxDeliveryNotification");
          expect(input.messageRef).toBe("transcript-ref#msg_20260221_001");
          return {
            delivered: true,
            message: "ok"
          };
        },
        emitBubbleNotification: async (_config, kind) => {
          calls.push("emitBubbleNotification");
          expect(kind).toBe("waiting-human");
          return {
            kind,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          };
        }
      }
    );

    expect(calls).toEqual([
      "emitTmuxDeliveryNotification",
      "emitBubbleNotification"
    ]);
  });
});
