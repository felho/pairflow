import { describe, expect, it } from "vitest";

import {
  sendAndSubmitTmuxPaneMessage,
  maybeAcceptClaudeTrustPrompt
} from "../../../src/v11/infrastructure/channel/tmux/tmuxInput.js";

describe("sendAndSubmitTmuxPaneMessage", () => {
  it("exits copy mode before sending text to the pane", async () => {
    const calls: string[][] = [];
    const runner = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "display-message") {
        return {
          stdout: "1",
          stderr: "",
          exitCode: 0
        };
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    await sendAndSubmitTmuxPaneMessage(runner, "pane-1", "hello");

    expect(calls).toEqual([
      ["display-message", "-p", "-t", "pane-1", "#{pane_in_mode}"],
      ["copy-mode", "-q", "-t", "pane-1"],
      ["send-keys", "-t", "pane-1", "-l", "hello"],
      ["send-keys", "-t", "pane-1", "Enter"]
    ]);
  });

  it("skips copy-mode reset when the pane is already in normal mode", async () => {
    const calls: string[][] = [];
    const runner = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "display-message") {
        return {
          stdout: "0",
          stderr: "",
          exitCode: 0
        };
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    await sendAndSubmitTmuxPaneMessage(runner, "pane-1", "hello");

    expect(calls).toEqual([
      ["display-message", "-p", "-t", "pane-1", "#{pane_in_mode}"],
      ["send-keys", "-t", "pane-1", "-l", "hello"],
      ["send-keys", "-t", "pane-1", "Enter"]
    ]);
  });
});

describe("maybeAcceptClaudeTrustPrompt", () => {
  it("accepts Claude folder trust prompts with Enter", async () => {
    const calls: string[][] = [];
    let captureCount = 0;
    const runner = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        if (captureCount === 1) {
          return {
            stdout: [
              "Accessing workspace:",
              "/home/dev/repos/pairflow--remote-smoke",
              "Security guide",
              "❯ 1. Yes, I trust this folder",
              "2. No, exit",
              "Enter to confirm · Esc to cancel"
            ].join("\n"),
            stderr: "",
            exitCode: 0
          };
        }
        return {
          stdout: "Claude Code is ready.",
          stderr: "",
          exitCode: 0
        };
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    const accepted = await maybeAcceptClaudeTrustPrompt(runner, "pane-1");

    expect(accepted).toBe(true);
    expect(calls).toEqual([
      ["capture-pane", "-pt", "pane-1"],
      ["send-keys", "-t", "pane-1", "Enter"],
      ["capture-pane", "-pt", "pane-1"]
    ]);
  });

  it("accepts Codex workspace trust prompts", async () => {
    const calls: string[][] = [];
    let captureCount = 0;
    const runner = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        if (captureCount === 1) {
          return {
            stdout: [
              "> You are in /home/dev/repos/pairflow--remote-smoke",
              "Do you trust the contents of this directory?",
              "1. Yes, continue",
              "2. No, quit"
            ].join("\n"),
            stderr: "",
            exitCode: 0
          };
        }
        return {
          stdout: "Codex ready.",
          stderr: "",
          exitCode: 0
        };
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    const accepted = await maybeAcceptClaudeTrustPrompt(runner, "pane-1");

    expect(accepted).toBe(true);
    expect(calls).toEqual([
      ["capture-pane", "-pt", "pane-1"],
      ["display-message", "-p", "-t", "pane-1", "#{pane_in_mode}"],
      ["send-keys", "-t", "pane-1", "-l", "1"],
      ["send-keys", "-t", "pane-1", "Enter"],
      ["capture-pane", "-pt", "pane-1"]
    ]);
  });

  it("accepts chained Claude trust and bypass-permissions prompts", async () => {
    const calls: string[][] = [];
    let captureCount = 0;
    const runner = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        if (captureCount === 1) {
          return {
            stdout: [
              "Accessing workspace:",
              "/home/dev/repos/pairflow--remote-smoke",
              "Security guide",
              "❯ 1. Yes, I trust this folder",
              "2. No, exit",
              "Enter to confirm · Esc to cancel"
            ].join("\n"),
            stderr: "",
            exitCode: 0
          };
        }
        if (captureCount === 2) {
          return {
            stdout: [
              "WARNING: Claude Code running in Bypass Permissions mode",
              "❯ 1. No, exit",
              "2. Yes, I accept",
              "Enter to confirm · Esc to cancel"
            ].join("\n"),
            stderr: "",
            exitCode: 0
          };
        }
        return {
          stdout: "Claude Code is ready.",
          stderr: "",
          exitCode: 0
        };
      }
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    const accepted = await maybeAcceptClaudeTrustPrompt(runner, "pane-1");

    expect(accepted).toBe(true);
    expect(calls).toEqual([
      ["capture-pane", "-pt", "pane-1"],
      ["send-keys", "-t", "pane-1", "Enter"],
      ["capture-pane", "-pt", "pane-1"],
      ["display-message", "-p", "-t", "pane-1", "#{pane_in_mode}"],
      ["send-keys", "-t", "pane-1", "-l", "2"],
      ["send-keys", "-t", "pane-1", "Enter"],
      ["capture-pane", "-pt", "pane-1"]
    ]);
  });
});
