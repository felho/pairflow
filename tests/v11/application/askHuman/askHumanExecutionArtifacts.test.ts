import { describe, expect, it } from "vitest";

import { buildAskHumanEnvelope } from "../../../../src/v11/application/askHuman/askHumanEnvelopeBuilder.js";
import { buildAskHumanStateWriteFailureMessage } from "../../../../src/v11/application/askHuman/askHumanExecutionFailureMessageBuilder.js";
import { buildAskHumanLockPath } from "../../../../src/v11/application/askHuman/askHumanLockPathBuilder.js";

describe("askHumanExecutionArtifacts", () => {
  const input = {
    routing: {
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      resolved: {
        bubbleId: "b_ask_human_01",
        bubblePaths: {
          locksDir: "/repo/.pairflow/bubbles/b_ask_human_01/locks"
        }
      },
      state: {
        active_agent: "codex",
        round: 2
      }
    }
  } as never;

  it("builds lock path for transcript append lock", () => {
    expect(buildAskHumanLockPath(input)).toBe(
      "/repo/.pairflow/bubbles/b_ask_human_01/locks/b_ask_human_01.lock"
    );
  });

  it("builds HUMAN_QUESTION protocol envelope payload", () => {
    expect(buildAskHumanEnvelope(input)).toEqual({
      bubble_id: "b_ask_human_01",
      sender: "codex",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: 2,
      payload: {
        question: "Need migration decision?"
      },
      refs: ["artifact://analysis.md"]
    });
  });

  it("builds transcript-first state write failure message", () => {
    expect(
      buildAskHumanStateWriteFailureMessage(
        {
          envelope: {
            id: "msg_20260221_777"
          }
        } as never,
        new Error("State fingerprint mismatch")
      )
    ).toBe(
      "HUMAN_QUESTION msg_20260221_777 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: State fingerprint mismatch"
    );
  });
});
