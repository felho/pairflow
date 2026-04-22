import { describe, expect, it, vi } from "vitest";

import {
  buildBubbleTmuxSessionName,
  launchBubbleSessionAck,
  respawnTmuxPaneCommand,
  terminateBubbleTmuxSession,
  type TmuxRunResult,
  type TmuxRunner
} from "../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";

const launchPanePlaceholderCommand = "sh -lc 'while :; do sleep 3600; done'";

function buildSplitPaneStdout(args: string[]): string {
  if (args[0] !== "split-window") {
    return "";
  }
  const targetIndex = args.indexOf("-t");
  const target = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
  if (target?.endsWith(":0.0")) {
    return "%11\n";
  }
  if (target === "%11" || target?.endsWith(":0.1")) {
    return "%12\n";
  }
  if (target === "%12" || target?.endsWith(":0.2")) {
    return "%13\n";
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

describe("launchBubbleSessionAck", () => {
  it("returns canonical running ack on successful launch", async () => {
    const runner: TmuxRunner = (args: string[]) =>
      Promise.resolve({
        stdout: buildSplitPaneStdout(args),
        stderr: "",
        exitCode: args[0] === "has-session" ? 1 : 0
      });

    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_ack",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner
    });

    expect(ack).toEqual({
      status: "running",
      sessionName: "pf-b_start_ack"
    });
  });

  it("returns canonical failed_to_start ack for session-exists failures", async () => {
    const runner: TmuxRunner = () =>
      Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_exists",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_SESSION_EXISTS",
      failure_kind: "session_exists",
      error_message: "tmux session already exists: pf-b_start_exists",
      sessionName: "pf-b_start_exists"
    });
  });

  it("returns canonical failed_to_start ack when workspace authority is missing", async () => {
    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_missing_workspace_ack",
      workspacePath: "   ",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude"
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_WORKSPACE_REQUIRED",
      failure_kind: "workspace_required",
      error_message:
        "LAUNCH_WORKSPACE_REQUIRED: context operation_id=launch_bubble_session bubble_id=b_start_missing_workspace_ack."
    });
  });

  it("returns canonical failed_to_start ack when tmux launch commands fail", async () => {
    const runner: TmuxRunner = (args: string[]) => {
      if (args[0] === "has-session") {
        return Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 1
        });
      }

      if (args[0] === "new-session") {
        return Promise.reject(new Error("tmux new-session failed"));
      }

      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_tmux_fail_ack",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_COMMAND_FAILED",
      failure_kind: "command_failed",
      error_message: "tmux new-session failed",
      sessionName: "pf-b_start_tmux_fail_ack"
    });
  });

  it("returns canonical failed_to_start ack when pane seeding throws after layout succeeds", async () => {
    const bubbleId = "b_start_seed_fail_ack";
    const ack = await launchBubbleSessionAck({
      bubbleId,
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      implementerBootstrapMessage: "bootstrap implementer",
      runner: (args: string[]) => {
        if (args[0] === "has-session") {
          return Promise.resolve({
            stdout: "",
            stderr: "",
            exitCode: 1
          });
        }

        if (args[0] === "send-keys") {
          return Promise.reject(new Error("tmux pane seed failed"));
        }

        return Promise.resolve({
          stdout: buildSplitPaneStdout(args),
          stderr: "",
          exitCode: 0
        });
      }
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_COMMAND_FAILED",
      failure_kind: "command_failed",
      error_message: "tmux pane seed failed",
      sessionName: buildBubbleTmuxSessionName(bubbleId)
    });
  });

  it("converts has-session transport failures into canonical failed_to_start ack", async () => {
    const bubbleId = "b_start_has_session_transport_fail_ack";
    const ack = await launchBubbleSessionAck({
      bubbleId,
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner: () => Promise.reject(new Error("tmux has-session transport failed"))
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_COMMAND_FAILED",
      failure_kind: "command_failed",
      error_message: "tmux has-session transport failed",
      sessionName: buildBubbleTmuxSessionName(bubbleId)
    });
  });

  it("converts has-session non-1 exit failures into canonical failed_to_start ack", async () => {
    const bubbleId = "b_start_has_session_exit_fail_ack";
    const sessionName = buildBubbleTmuxSessionName(bubbleId);
    const ack = await launchBubbleSessionAck({
      bubbleId,
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner: () =>
        Promise.resolve({
          stdout: "",
          stderr: "can't connect to tmux server",
          exitCode: 2
        })
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_COMMAND_FAILED",
      failure_kind: "command_failed",
      error_message:
        `tmux command failed (exit 2): tmux has-session -t ${sessionName}\ncan't connect to tmux server`,
      sessionName
    });
  });

  it("does not flatten internal pane-id parse invariants into tmux startup failure ack", async () => {
    await expect(() =>
      launchBubbleSessionAck({
        bubbleId: "b_start_parse_failure_ack",
        workspacePath: "/tmp/worktree",
        statusCommand: "status",
        implementerCommand: "codex",
        reviewerCommand: "claude",
        runner: (args: string[]) =>
          Promise.resolve({
            stdout:
              args[0] === "has-session"
                ? ""
                : args[0] === "split-window"
                  ? "not-a-pane-id\n"
                  : "",
            stderr: "",
            exitCode: args[0] === "has-session" ? 1 : 0
          })
      })
    ).rejects.toThrow("TMUX_PANE_ID_PARSE_FAILED:");
  });

});

describe("launchBubbleSessionAck orchestration", () => {

  it("creates a 4-pane session layout", async () => {
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

    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_01",
      workspacePath: "/tmp/worktree",
      statusCommand: "pairflow bubble status --id b_start_01",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner
    });

    expect(ack).toEqual({
      status: "running",
      sessionName: "pf-b_start_01"
    });
    expect(calls.map((call) => call.args[0])).toEqual([
      "has-session",
      "new-session",
      "set-option",
      "set-window-option",
      "set-window-option",
      "set-environment",
      "set-environment",
      "set-environment",
      "set-environment",
      "split-window",
      "resize-pane",
      "split-window",
      "split-window",
      "resize-pane",
      "set-hook",
      "set-hook",
      "run-shell",
      "respawn-pane",
      "respawn-pane",
      "respawn-pane"
    ]);
    expect(calls[2]?.args).toEqual([
      "set-option",
      "-t",
      "pf-b_start_01:0",
      "remain-on-exit",
      "on"
    ]);
    expect(calls[3]?.args).toEqual([
      "set-window-option",
      "-t",
      "pf-b_start_01:0",
      "pane-border-status",
      "top"
    ]);
    expect(calls[4]?.args).toEqual([
      "set-window-option",
      "-t",
      "pf-b_start_01:0",
      "pane-border-format",
      "#{?#{==:#{pane_index},0},[orchestrator/status]-[b_start_01],#{?#{==:#{pane_index},1},[codex/implementer],#{?#{==:#{pane_index},2},[claude/reviewer],#{?#{==:#{pane_index},3},[codex/meta-reviewer],pane-#{pane_index}}}}}"
    ]);
    // Unset CLAUDECODE from server global env and session env.
    expect(calls[5]?.args).toEqual([
      "set-environment",
      "-g",
      "-u",
      "CLAUDECODE"
    ]);
    expect(calls[6]?.args).toEqual([
      "set-environment",
      "-t",
      "pf-b_start_01",
      "-u",
      "CLAUDECODE"
    ]);
    // Unset NO_COLOR from server global env and session env.
    expect(calls[7]?.args).toEqual([
      "set-environment",
      "-g",
      "-u",
      "NO_COLOR"
    ]);
    expect(calls[8]?.args).toEqual([
      "set-environment",
      "-t",
      "pf-b_start_01",
      "-u",
      "NO_COLOR"
    ]);
    expect(calls[0]?.allowFailure).toBe(true);
    expect(calls[9]?.args).toEqual([
      "split-window",
      "-v",
      "-P",
      "-F",
      "#{pane_id}",
      "-t",
      "pf-b_start_01:0.0",
      "-c",
      "/tmp/worktree",
      launchPanePlaceholderCommand
    ]);
    // Status pane fixed to 13 lines before reviewer split.
    expect(calls[10]?.args).toEqual([
      "resize-pane",
      "-t",
      "pf-b_start_01:0.0",
      "-y",
      "13"
    ]);
    // Reviewer split targets the implementer pane directly; frame hooks normalize heights later.
    expect(calls[11]?.args).toEqual([
      "split-window",
      "-v",
      "-P",
      "-F",
      "#{pane_id}",
      "-t",
      "pf-b_start_01:0.1",
      "-c",
      "/tmp/worktree",
      launchPanePlaceholderCommand
    ]);
    // Meta-reviewer split targets the reviewer pane directly.
    expect(calls[12]?.args).toEqual([
      "split-window",
      "-v",
      "-P",
      "-F",
      "#{pane_id}",
      "-t",
      "pf-b_start_01:0.2",
      "-c",
      "/tmp/worktree",
      launchPanePlaceholderCommand
    ]);
    expect(calls[14]?.args?.slice(0, 4)).toEqual([
      "set-hook",
      "-t",
      "pf-b_start_01",
      "client-resized"
    ]);
    expect(calls[14]?.args?.[4]).toContain("run-shell '");
    expect(calls[14]?.args?.[4]).toContain(
      "WINDOW_HEIGHT=$(tmux display-message -p -t pf-b_start_01:0"
    );
    expect(calls[14]?.args?.[4]).toContain("REMAIN=$((WINDOW_HEIGHT - 17))");
    expect(calls[14]?.args?.[4]).toContain("tmux resize-pane -t %11 -y $ROW");
    expect(calls[14]?.args?.[4]).toContain("tmux resize-pane -t %12 -y $ROW");
    expect(calls[14]?.args?.[4]).toContain("tmux resize-pane -t %13 -y $ROW_LAST");
    expect(calls[15]?.args?.slice(0, 4)).toEqual([
      "set-hook",
      "-t",
      "pf-b_start_01",
      "window-resized"
    ]);
    expect(calls[15]?.args?.[4]).toContain("run-shell '");
    expect(calls[17]?.args).toEqual([
      "respawn-pane",
      "-k",
      "-t",
      "pf-b_start_01:0.1",
      "-c",
      "/tmp/worktree",
      "codex"
    ]);
    expect(calls[18]?.args).toEqual([
      "respawn-pane",
      "-k",
      "-t",
      "pf-b_start_01:0.2",
      "-c",
      "/tmp/worktree",
      "claude"
    ]);
    expect(calls[19]?.args).toEqual([
      "respawn-pane",
      "-k",
      "-t",
      "pf-b_start_01:0.3",
      "-c",
      "/tmp/worktree",
      "claude"
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

    await launchBubbleSessionAck({
      bubbleId: "b_start_kickoff",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      implementerKickoffMessage: "implementer kickoff message",
      runner
    });

    expect(calls.slice(0, 17).map((call) => call[0])).toEqual([
      "has-session",
      "new-session",
      "set-option",
      "set-window-option",
      "set-window-option",
      "set-environment",
      "set-environment",
      "set-environment",
      "set-environment",
      "split-window",
      "resize-pane",
      "split-window",
      "split-window",
      "resize-pane",
      "set-hook",
      "set-hook",
      "run-shell"
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

  it("retries Enter when kickoff remains stuck in the implementer input buffer", async () => {
    vi.useFakeTimers();
    const calls: string[][] = [];
    let captureCount = 0;
    const kickoffMessage =
      "# [pairflow] bubble=b_start_kickoff_retry kickoff. Start implementation now.";
    const runner: TmuxRunner = (args: string[]) => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        if (captureCount === 1) {
          return Promise.resolve({
            stdout: "Codex ready.",
            stderr: "",
            exitCode: 0
          });
        }
        if (captureCount === 2) {
          return Promise.resolve({
            stdout: [
              "Codex ready.",
              "",
              `❯ ${kickoffMessage}`
            ].join("\n"),
            stderr: "",
            exitCode: 0
          });
        }
        return Promise.resolve({
          stdout: [
            kickoffMessage,
            "",
            "❯"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: buildSplitPaneStdout(args),
        stderr: "",
        exitCode: args[0] === "has-session" ? 1 : 0
      });
    };

    const launchPromise = launchBubbleSessionAck({
      bubbleId: "b_start_kickoff_retry",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      implementerKickoffMessage: kickoffMessage,
      runner
    });

    await vi.advanceTimersByTimeAsync(4000);
    await launchPromise;
    vi.useRealTimers();

    const implementerEnterCalls = calls.filter(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "%11" &&
        call[3] === "Enter"
    );
    expect(implementerEnterCalls.length).toBeGreaterThanOrEqual(2);
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

    await launchBubbleSessionAck({
      bubbleId: "b_start_kickoff_reviewer",
      workspacePath: "/tmp/worktree",
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

    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_kickoff_fail",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      implementerKickoffMessage: "kickoff message",
      runner
    });

    expect(ack).toEqual({
      status: "running",
      sessionName: "pf-b_start_kickoff_fail"
    });
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

  it("submits codex startup prompt before sending kickoff when requested", async () => {
    vi.useFakeTimers();
    const calls: string[][] = [];
    const runner: TmuxRunner = (args: string[]) => {
      calls.push(args);
      return Promise.resolve({
        stdout: buildSplitPaneStdout(args),
        stderr: "",
        exitCode: args[0] === "has-session" ? 1 : 0
      });
    };

    const launchPromise = launchBubbleSessionAck({
      bubbleId: "b_start_submit_prompt",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex 'seeded prompt'",
      reviewerCommand: "claude",
      implementerSubmitStartupPrompt: true,
      implementerKickoffMessage: "kickoff message",
      runner
    });

    await vi.advanceTimersByTimeAsync(2000);
    await launchPromise;
    vi.useRealTimers();

    const implementerSendKeys = calls.filter(
      (call) => call[0] === "send-keys" && call[2] === "%11"
    );
    expect(implementerSendKeys[0]).toEqual([
      "send-keys",
      "-t",
      "%11",
      "Enter"
    ]);
    expect(implementerSendKeys).toContainEqual([
      "send-keys",
      "-t",
      "%11",
      "-l",
      "kickoff message"
    ]);
  });

  it("fails when session already exists", async () => {
    const runner: TmuxRunner = (args) =>
      Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: args[0] === "has-session" ? 0 : 0
      });

    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_02",
      workspacePath: "/tmp/worktree",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_SESSION_EXISTS",
      failure_kind: "session_exists",
      error_message: "tmux session already exists: pf-b_start_02",
      sessionName: "pf-b_start_02"
    });
  });

  it("fails closed when canonical workspacePath is empty", async () => {
    const ack = await launchBubbleSessionAck({
      bubbleId: "b_start_missing_workspace",
      workspacePath: "   ",
      statusCommand: "status",
      implementerCommand: "codex",
      reviewerCommand: "claude",
      runner: vi.fn()
    });

    expect(ack).toEqual({
      status: "failed_to_start",
      reason_code: "LAUNCH_ACK_WORKSPACE_REQUIRED",
      failure_kind: "workspace_required",
      error_message:
        "LAUNCH_WORKSPACE_REQUIRED: context operation_id=launch_bubble_session bubble_id=b_start_missing_workspace."
    });
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
