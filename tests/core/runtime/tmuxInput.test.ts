import { describe, expect, it } from "vitest";

import {
  maybeAcceptClaudeTrustPrompt
} from "../../../src/v11/infrastructure/channel/tmux/tmuxInput.js";

describe("maybeAcceptClaudeTrustPrompt", () => {
  it("accepts Codex workspace trust prompts", async () => {
    const calls: string[][] = [];
    const runner = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "capture-pane") {
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
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    const accepted = await maybeAcceptClaudeTrustPrompt(runner, "pane-1");

    expect(accepted).toBe(true);
    expect(calls).toEqual([
      ["capture-pane", "-pt", "pane-1"],
      ["send-keys", "-t", "pane-1", "-l", "1"],
      ["send-keys", "-t", "pane-1", "Enter"]
    ]);
  });
});
