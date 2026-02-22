import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESUME_MESSAGE,
  resumeBubble
} from "../../../src/core/bubble/resumeBubble.js";
import type { EmitHumanReplyResult } from "../../../src/core/human/reply.js";

function createResumeResultFixture(): EmitHumanReplyResult {
  return {
    bubbleId: "b_resume_01",
    sequence: 12,
    envelope: {
      id: "msg_20260222_012",
      ts: "2026-02-22T12:00:00.000Z",
      bubble_id: "b_resume_01",
      sender: "human",
      recipient: "codex",
      type: "HUMAN_REPLY",
      round: 1,
      payload: {
        message: DEFAULT_RESUME_MESSAGE
      },
      refs: []
    },
    state: {
      bubble_id: "b_resume_01",
      state: "RUNNING",
      round: 1,
      active_agent: "codex",
      active_since: "2026-02-22T11:50:00.000Z",
      active_role: "implementer",
      round_role_history: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-22T11:50:00.000Z"
        }
      ],
      last_command_at: "2026-02-22T12:00:00.000Z"
    }
  };
}

describe("resumeBubble", () => {
  it("delegates to emitHumanReply with default resume message", async () => {
    const now = new Date("2026-02-22T12:00:00.000Z");
    const resultFixture = createResumeResultFixture();
    let capturedInput:
      | {
          bubbleId: string;
          message: string;
          repoPath?: string;
          cwd?: string;
          now?: Date;
        }
      | undefined;

    const result = await resumeBubble(
      {
        bubbleId: "b_resume_01",
        repoPath: "/tmp/repo",
        cwd: "/tmp/repo/worktree",
        now
      },
      {
        emitHumanReply: (input) => {
          capturedInput = input;
          return Promise.resolve(resultFixture);
        }
      }
    );

    expect(capturedInput).toEqual({
      bubbleId: "b_resume_01",
      message: DEFAULT_RESUME_MESSAGE,
      repoPath: "/tmp/repo",
      cwd: "/tmp/repo/worktree",
      now
    });
    expect(result).toEqual(resultFixture);
  });

  it("maps underlying errors to ResumeBubbleError", async () => {
    await expect(
      resumeBubble(
        {
          bubbleId: "b_resume_02"
        },
        {
          emitHumanReply: () =>
            Promise.reject(
              new Error(
                "bubble reply can only be used while bubble is WAITING_HUMAN (current: RUNNING)."
              )
            )
        }
      )
    ).rejects.toThrow(/WAITING_HUMAN/u);
  });
});
