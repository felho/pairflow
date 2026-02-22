import { describe, expect, it } from "vitest";

import {
  buildBubbleTmuxSessionName,
  launchBubbleTmuxSession,
  TmuxSessionExistsError,
  type TmuxRunResult,
  type TmuxRunner
} from "../../../src/core/runtime/tmuxManager.js";

describe("buildBubbleTmuxSessionName", () => {
  it("normalizes unsafe characters", () => {
    const sessionName = buildBubbleTmuxSessionName("b.feature/10");
    expect(sessionName).toBe("pf-b-feature-10");
  });

  it("fits long names into tmux-safe length", () => {
    const longId = "b_very_long_bubble_id_that_exceeds_tmux_session_name_limits_01";
    const sessionName = buildBubbleTmuxSessionName(longId);

    expect(sessionName.length).toBeLessThanOrEqual(32);
    expect(sessionName.startsWith("pf-")).toBe(true);
  });
});

describe("launchBubbleTmuxSession", () => {
  it("creates a 3-pane session layout", async () => {
    const calls: Array<{ args: string[]; allowFailure: boolean }> = [];

    const runner: TmuxRunner = (
      args: string[],
      options = {}
    ): Promise<TmuxRunResult> => {
      calls.push({
        args,
        allowFailure: options.allowFailure ?? false
      });
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode:
          args[0] === "has-session" ? 1 : 0
      });
    };

    const result = await launchBubbleTmuxSession({
      bubbleId: "b_start_01",
      worktreePath: "/tmp/worktree",
      statusCommand: "pairflow bubble status --id b_start_01",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner
    });

    expect(result.sessionName).toBe("pf-b_start_01");
    expect(calls.map((call) => call.args[0])).toEqual([
      "has-session",
      "new-session",
      "split-window",
      "split-window",
      "select-layout"
    ]);
    expect(calls[0]?.allowFailure).toBe(true);
  });

  it("fails when session already exists", async () => {
    const runner: TmuxRunner = (args) =>
      Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: args[0] === "has-session" ? 0 : 0
      });

    await expect(
      launchBubbleTmuxSession({
        bubbleId: "b_start_02",
        worktreePath: "/tmp/worktree",
        statusCommand: "status",
        implementerCommand: "codex",
        reviewerCommand: "claude",
        runner
      })
    ).rejects.toBeInstanceOf(TmuxSessionExistsError);
  });
});
