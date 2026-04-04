import { describe, expect, it } from "vitest";

import { emitOptionalAskHumanNotifications } from "../../../../src/v11/shared/askHuman/askHumanNotificationEmission.js";

describe("askHumanNotificationEmission", () => {
  it("emits optional tmux delivery and bubble notification signals", async () => {
    const calls: string[] = [];

    const result = await emitOptionalAskHumanNotifications(
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
      "emitBubbleNotification",
      "emitTmuxDeliveryNotification"
    ]);
    expect(result).toEqual({
      deliveryResult: {
        delivered: true,
        message: "ok"
      }
    });
  });

  it("maps thrown delivery errors to tmux_send_failed sentinel instead of dropping delivery info", async () => {
    const result = await emitOptionalAskHumanNotifications(
      {
        bubbleId: "b_ask_human_02",
        bubbleConfig: {
          id: "b_ask_human_02"
        } as never,
        sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_02/runtime/sessions.json",
        envelope: {
          id: "msg_20260221_002"
        } as never,
        messageRef: "transcript-ref#msg_20260221_002"
      },
      {
        emitTmuxDeliveryNotification: async () => {
          throw new Error("tmux boom");
        },
        emitBubbleNotification: async () => ({
          kind: "waiting-human",
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        })
      }
    );

    expect(result).toEqual({
      deliveryResult: {
        delivered: false,
        message: "tmux delivery notification failed: tmux boom",
        reason: "tmux_send_failed"
      }
    });
  });

  it("keeps detached bubble-notification failures non-blocking and preserves tmux delivery result", async () => {
    const result = await emitOptionalAskHumanNotifications(
      {
        bubbleId: "b_ask_human_03",
        bubbleConfig: {
          id: "b_ask_human_03"
        } as never,
        sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_03/runtime/sessions.json",
        envelope: {
          id: "msg_20260221_003"
        } as never,
        messageRef: "transcript-ref#msg_20260221_003"
      },
      {
        emitTmuxDeliveryNotification: async () => ({
          delivered: true,
          message: "ok"
        }),
        emitBubbleNotification: async () => {
          throw new Error("notification boom");
        }
      }
    );

    expect(result).toEqual({
      deliveryResult: {
        delivered: true,
        message: "ok"
      }
    });
  });
});
