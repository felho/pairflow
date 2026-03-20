import { describe, expect, it } from "vitest";

import {
  buildAskHumanAppendEnvelopeInput,
  buildAskHumanWriteSnapshotCallInput
} from "../../../../src/v11/shared/askHuman/askHumanExecutionCallInputBuilders.js";

describe("askHumanExecutionCallInputBuilders", () => {
  it("builds append-envelope call input", () => {
    const now = new Date("2026-03-20T11:00:00.000Z");
    const input = {
      now,
      routing: {
        question: "Need migration decision?",
        refs: ["artifact://analysis.md"],
        state: {
          round: 2,
          active_agent: "codex"
        },
        resolved: {
          bubbleId: "b_ask_human_01",
          bubblePaths: {
            transcriptPath: "/repo/.pairflow/bubbles/b_ask_human_01/transcript.ndjson",
            inboxPath: "/repo/.pairflow/bubbles/b_ask_human_01/inbox.ndjson"
          }
        }
      }
    } as never;

    const appendInput = buildAskHumanAppendEnvelopeInput(
      input,
      "/repo/.pairflow/bubbles/b_ask_human_01/locks/b_ask_human_01.lock"
    );

    expect(appendInput).toMatchObject({
      transcriptPath: "/repo/.pairflow/bubbles/b_ask_human_01/transcript.ndjson",
      mirrorPaths: ["/repo/.pairflow/bubbles/b_ask_human_01/inbox.ndjson"],
      lockPath: "/repo/.pairflow/bubbles/b_ask_human_01/locks/b_ask_human_01.lock",
      now,
      envelope: {
        bubble_id: "b_ask_human_01",
        sender: "codex",
        recipient: "human",
        type: "HUMAN_QUESTION",
        round: 2,
        payload: {
          question: "Need migration decision?"
        },
        refs: ["artifact://analysis.md"]
      }
    });
  });

  it("builds write-snapshot call input", () => {
    const input = {
      routing: {
        resolved: {
          bubblePaths: {
            statePath: "/repo/.pairflow/bubbles/b_ask_human_01/state.json"
          }
        },
        loadedState: {
          fingerprint: "fp_running_01"
        }
      }
    } as never;
    const nextState = {
      state: "WAITING_HUMAN"
    } as never;

    const writeInput = buildAskHumanWriteSnapshotCallInput(input, nextState);

    expect(writeInput).toEqual({
      statePath: "/repo/.pairflow/bubbles/b_ask_human_01/state.json",
      state: nextState,
      options: {
        expectedFingerprint: "fp_running_01",
        expectedState: "RUNNING"
      }
    });
  });
});
