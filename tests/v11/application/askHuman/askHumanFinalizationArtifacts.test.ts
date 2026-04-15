import { describe, expect, it } from "vitest";

import {
  buildAskHumanFinalizationResult,
  buildAskHumanLifecycleMetricMetadata
} from "../../../../src/v11/shared/askHuman/askHumanFinalizationArtifacts.js";

describe("askHumanFinalizationArtifacts", () => {
  it("builds ask-human lifecycle metric metadata", () => {
    expect(
      buildAskHumanLifecycleMetricMetadata({
        sender: "codex",
        refs: ["artifact://a", "artifact://b"],
        question: "Need migration decision?"
      })
    ).toEqual({
      sender: "codex",
      refs_count: 2,
      question_length: 24
    });
  });

  it("builds ask-human finalization result payload", () => {
    expect(
      buildAskHumanFinalizationResult({
        bubbleId: "b_ask_human_01",
        sequence: 3,
        envelope: {
          id: "msg_20260221_001"
        } as never,
        state: {
          state: "WAITING_HUMAN"
        } as never
      })
    ).toMatchObject({
      bubbleId: "b_ask_human_01",
      sequence: 3,
      envelope: {
        id: "msg_20260221_001"
      },
      state: {
        state: "WAITING_HUMAN"
      },
      inferredRecipient: "human"
    });
  });

  it("omits empty-string delivery messages from the finalization projection by contract", () => {
    expect(
      buildAskHumanFinalizationResult({
        bubbleId: "b_ask_human_02",
        sequence: 4,
        envelope: {
          id: "msg_20260221_002"
        } as never,
        state: {
          state: "WAITING_HUMAN"
        } as never,
        deliveryResult: {
          status: "rejected",
          delivered: false,
          message: "",
          reason: "tmux_send_failed",
          reason_code: "DELIVERY_ACK_REJECTED"
        }
      })
    ).toEqual({
      bubbleId: "b_ask_human_02",
      sequence: 4,
      envelope: {
        id: "msg_20260221_002"
      },
      state: {
        state: "WAITING_HUMAN"
      },
      inferredRecipient: "human",
      delivery: {
        status: "rejected",
        delivered: false,
        reason: "tmux_send_failed",
        reason_code: "DELIVERY_ACK_REJECTED"
      }
    });
  });
});
