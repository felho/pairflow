import { describe, expect, it } from "vitest";

import { buildAskHumanFinalizationNotificationInput } from "../../../../src/v11/application/askHuman/askHumanFinalizationNotificationInputBuilder.js";

describe("askHumanFinalizationNotificationInputBuilder", () => {
  it("builds notification emission input from finalization state", () => {
    const envelope = {
      id: "msg_20260320_001"
    } as never;
    const input = {
      routing: {
        resolved: {
          bubbleId: "b_ask_human_01",
          bubbleConfig: {
            id: "b_ask_human_01"
          },
          bubblePaths: {
            sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_01/runtime/sessions.json"
          }
        }
      },
      appended: {
        envelope
      }
    } as never;

    const notificationInput = buildAskHumanFinalizationNotificationInput(
      input,
      "transcript-ref#msg_20260320_001"
    );

    expect(notificationInput).toEqual({
      bubbleId: "b_ask_human_01",
      bubbleConfig: {
        id: "b_ask_human_01"
      },
      sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_01/runtime/sessions.json",
      envelope,
      messageRef: "transcript-ref#msg_20260320_001"
    });
  });
});
