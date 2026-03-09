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

function buildSplitPaneStdout(args: string[]): string {
  if (args[0] !== "split-window") {
    return "";
  }
  const command = args.at(-1);
  if (command === "codex") {
    return "%11\n";
  }
  if (command === "claude") {
    return "%12\n";
  }
  return "%99\n";
}

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
        stdout: buildSplitPaneStdout(args),
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
      "set-environment",
      "set-environment",
      "set-environment",
      "set-environment",
      "split-window",
      "resize-pane",
      "split-window",
      "resize-pane",
      "set-hook"
    ]);
    // Unset CLAUDECODE from server global env and session env.
    expect(calls[2]?.args).toEqual([
      "set-environment",
      "-g",
      "-u",
      "CLAUDECODE"
    ]);
    expect(calls[3]?.args).toEqual([
      "set-environment",
      "-t",
      "pf-b_start_01",
      "-u",
      "CLAUDECODE"
    ]);
    // Unset NO_COLOR from server global env and session env.
    expect(calls[4]?.args).toEqual([
      "set-environment",
      "-g",
      "-u",
      "NO_COLOR"
    ]);
    expect(calls[5]?.args).toEqual([
      "set-environment",
      "-t",
      "pf-b_start_01",
      "-u",
      "NO_COLOR"
    ]);
    expect(calls[0]?.allowFailure).toBe(true);
    expect(calls[6]?.args).toEqual([
      "split-window",
      "-v",
      "-P",
      "-F",
      "#{pane_id}",
      "-t",
      "pf-b_start_01:0.0",
      "-c",
      "/tmp/worktree",
      "codex"
    ]);
    // Status pane fixed to 11 lines before reviewer split.
    expect(calls[7]?.args).toEqual([
      "resize-pane",
      "-t",
      "pf-b_start_01:0.0",
      "-y",
      "11"
    ]);
    // Reviewer split uses -p 50 to divide remaining space equally.
    expect(calls[8]?.args).toEqual([
      "split-window",
      "-v",
      "-P",
      "-F",
      "#{pane_id}",
      "-t",
      "%11",
      "-p",
      "50",
      "-c",
      "/tmp/worktree",
      "claude"
    ]);
    expect(calls[10]?.args).toEqual([
      "set-hook",
      "-t",
      "pf-b_start_01",
      "client-resized",
      "run-shell \"tmux resize-pane -t pf-b_start_01:0.0 -y 11 2>/dev/null || true; REMAIN=\\$((#{window_height} - 13)); tmux resize-pane -t %11 -y \\$((REMAIN / 2)) 2>/dev/null || true\""
    ]);
  });

  it("sends kickoff message to implementer pane when provided", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args: string[]) => {
      calls.push(args);
      return Promise.resolve({
        stdout: buildSplitPaneStdout(args),
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

    expect(calls.slice(0, 11).map((call) => call[0])).toEqual([
      "has-session",
      "new-session",
      "set-environment",
      "set-environment",
      "set-environment",
      "set-environment",
      "split-window",
      "resize-pane",
      "split-window",
      "resize-pane",
      "set-hook"
    ]);
    // Trust prompt check before kickoff.
    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "%11"
    ]);
    // Text and Enter are separate send-keys calls (ink TUI requirement).
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "%11",
      "-l",
      "implementer kickoff message"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "%11",
      "Enter"
    ]);
    // No bootstrap messages sent to reviewer pane.
    const reviewerSendKeysByPaneId = calls.filter(
      (call) => call[0] === "send-keys" && call[2] === "%12"
    );
    expect(reviewerSendKeysByPaneId).toHaveLength(0);
  });

  it("sends kickoff message to reviewer pane when provided", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args: string[]) => {
      calls.push(args);
      return Promise.resolve({
        stdout: buildSplitPaneStdout(args),
        stderr: "",
        exitCode: args[0] === "has-session" ? 1 : 0
      });
    };

    await launchBubbleTmuxSession({
      bubbleId: "b_start_kickoff_reviewer",
      worktreePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      reviewerKickoffMessage: "reviewer kickoff message",
      runner
    });

    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "%12"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "%12",
      "-l",
      "reviewer kickoff message"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "%12",
      "Enter"
    ]);

    const implementerSendKeys = calls.filter(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "%11"
    );
    expect(implementerSendKeys).toHaveLength(0);
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
        args[2] === "%11"
      ) {
        return Promise.resolve({
          stdout: "",
          stderr: "can't find pane: 1",
          exitCode: 1
        });
      }
      return Promise.resolve({
        stdout: buildSplitPaneStdout(args),
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
        call.args[2] === "%11"
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

  it("treats `no current target` as non-fatal missing session signal", async () => {
    const runner: TmuxRunner = () =>
      Promise.resolve({
        stdout: "",
        stderr: "no current target",
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
