import { describe, expect, it } from "vitest";

import {
  buildBubbleTmuxSessionName,
  launchBubbleTmuxSession,
  respawnTmuxPaneCommand,
  terminateBubbleTmuxSession,
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

  it("keeps long near-collision ids unique via hash suffix", () => {
    const idA = "b_very_long_bubble_id_that_exceeds_tmux_session_name_limits_alpha";
    const idB = "b_very_long_bubble_id_that_exceeds_tmux_session_name_limits_beta";
    const nameA = buildBubbleTmuxSessionName(idA);
    const nameB = buildBubbleTmuxSessionName(idB);

    expect(nameA).not.toBe(nameB);
    expect(nameA.length).toBeLessThanOrEqual(32);
    expect(nameB.length).toBeLessThanOrEqual(32);
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
      "select-layout",
      "resize-pane"
    ]);
    expect(calls[0]?.allowFailure).toBe(true);
    expect(calls[2]?.args).toEqual([
      "split-window",
      "-v",
      "-t",
      "pf-b_start_01:0.0",
      "-c",
      "/tmp/worktree",
      "codex"
    ]);
    expect(calls[3]?.args).toEqual([
      "split-window",
      "-v",
      "-t",
      "pf-b_start_01:0.1",
      "-c",
      "/tmp/worktree",
      "claude"
    ]);
    expect(calls[4]?.args).toEqual([
      "select-layout",
      "-t",
      "pf-b_start_01:0",
      "even-vertical"
    ]);
    expect(calls[5]?.args).toEqual([
      "resize-pane",
      "-t",
      "pf-b_start_01:0.0",
      "-y",
      "7"
    ]);
  });

  it("sends kickoff message to implementer pane when provided", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args: string[]) => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: args[0] === "has-session" ? 1 : 0
      });
    };

    await launchBubbleTmuxSession({
      bubbleId: "b_start_kickoff",
      worktreePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      implementerKickoffMessage: "implementer kickoff message",
      runner
    });

    expect(calls.slice(0, 6).map((call) => call[0])).toEqual([
      "has-session",
      "new-session",
      "split-window",
      "split-window",
      "select-layout",
      "resize-pane"
    ]);
    // Trust prompt check before kickoff.
    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "pf-b_start_kickoff:0.1"
    ]);
    // Text and Enter are separate send-keys calls (ink TUI requirement).
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_start_kickoff:0.1",
      "-l",
      "implementer kickoff message"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_start_kickoff:0.1",
      "Enter"
    ]);
    // No bootstrap messages sent to reviewer pane.
    const reviewerSendKeys = calls.filter(
      (call) => call[0] === "send-keys" && call[2] === "pf-b_start_kickoff:0.2"
    );
    expect(reviewerSendKeys).toHaveLength(0);
  });

  it("keeps start non-blocking when kickoff send-keys fails", async () => {
    const calls: Array<{ args: string[]; allowFailure: boolean }> = [];
    const runner: TmuxRunner = (
      args: string[],
      options = {}
    ): Promise<TmuxRunResult> => {
      calls.push({
        args,
        allowFailure: options.allowFailure ?? false
      });
      if (
        args[0] === "send-keys" &&
        args[2] === "pf-b_start_kickoff_fail:0.1"
      ) {
        return Promise.resolve({
          stdout: "",
          stderr: "can't find pane: 1",
          exitCode: 1
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: args[0] === "has-session" ? 1 : 0
      });
    };

    const result = await launchBubbleTmuxSession({
      bubbleId: "b_start_kickoff_fail",
      worktreePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      implementerKickoffMessage: "kickoff message",
      runner
    });

    expect(result.sessionName).toBe("pf-b_start_kickoff_fail");
    // Both the literal message send and the Enter send use allowFailure.
    const failedSends = calls.filter(
      (call) =>
        call.args[0] === "send-keys" &&
        call.args[2] === "pf-b_start_kickoff_fail:0.1"
    );
    expect(failedSends.length).toBeGreaterThan(0);
    for (const send of failedSends) {
      expect(send.allowFailure).toBe(true);
    }
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

describe("terminateBubbleTmuxSession", () => {
  it("kills an existing session and reports existed=true", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args) => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await terminateBubbleTmuxSession({
      bubbleId: "b_start_04",
      runner
    });

    expect(result.sessionName).toBe("pf-b_start_04");
    expect(result.existed).toBe(true);
    expect(calls).toEqual([["kill-session", "-t", "pf-b_start_04"]]);
  });

  it("treats missing sessions as non-fatal cleanup result", async () => {
    const runner: TmuxRunner = () =>
      Promise.resolve({
        stdout: "",
        stderr: "can't find session: pf-missing",
        exitCode: 1
      });

    const result = await terminateBubbleTmuxSession({
      sessionName: "pf-missing",
      runner
    });

    expect(result).toEqual({
      sessionName: "pf-missing",
      existed: false
    });
  });
});

describe("respawnTmuxPaneCommand", () => {
  it("respawns target pane command with kill flag", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args) => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    await respawnTmuxPaneCommand({
      sessionName: "pf-b_start_01",
      paneIndex: 2,
      cwd: "/tmp/worktree",
      command: "claude",
      runner
    });

    expect(calls).toEqual([
      [
        "respawn-pane",
        "-k",
        "-t",
        "pf-b_start_01:0.2",
        "-c",
        "/tmp/worktree",
        "claude"
      ]
    ]);
  });
});
