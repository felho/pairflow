import { describe, expect, it } from "vitest";

import { emitOptionalAskHumanNotifications } from "../../../../src/v11/application/askHuman/askHumanNotificationEmission.js";
import type { EmitDeliveryNotificationInput } from "../../../../src/v11/shared/delivery/tmuxDeliveryContract.js";

describe("askHumanNotificationEmission", () => {
  it("emits optional delivery-ack and bubble notification signals", async () => {
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
        emitDeliveryNotificationAck: async (
          input: EmitDeliveryNotificationInput
        ) => {
          calls.push("emitDeliveryNotificationAck");
          expect(input.messageRef).toBe("transcript-ref#msg_20260221_001");
          return {
            status: "accepted",
            delivered: true,
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
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
      "emitDeliveryNotificationAck"
    ]);
    expect(result).toEqual({
      deliveryResult: {
        status: "accepted",
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
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
        emitDeliveryNotificationAck: async () => {
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
        status: "rejected",
        message: "tmux delivery notification failed: tmux boom",
        reason: "tmux_send_failed",
        reason_code: "DELIVERY_ACK_REJECTED"
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
        emitDeliveryNotificationAck: async () => ({
          status: "accepted",
          delivered: true,
          message: "ok",
          sessionName: "pf_bubble",
          targetPaneIndex: 1
        }),
        emitBubbleNotification: async () => {
          throw new Error("notification boom");
        }
      }
    );

    expect(result).toEqual({
      deliveryResult: {
        status: "accepted",
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      }
    });
  });
});
