import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESUME_MESSAGE,
  resumeBubbleV11
} from "../../../../src/v11/application/resume/emitResumeV11.js";
import type { EmitHumanReplyResult } from "../../../../src/v11/application/reply/replyCommandContract.js";

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

describe("resumeCommandOrchestration", () => {
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

    const result = await resumeBubbleV11(
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
});
