import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  getBubbleRestartHelpText,
  parseBubbleRestartCommandOptions,
  runBubbleRestartCommand
} from "../../src/cli/commands/bubble/restart.js";
import type { RestartBubbleResult } from "../../src/v11/application/restart/restartCommandApi.js";

describe("parseBubbleRestartCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleRestartCommandOptions([
      "--id",
      "b_restart_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble restart options");
    }

    expect(parsed.id).toBe("b_restart_01");
    expect(parsed.repo).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseBubbleRestartCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleRestartHelpText()).toContain("pairflow bubble restart");
  });

  it("requires --id", () => {
    expect(() => parseBubbleRestartCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleRestartCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleRestartCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("delegates to restartBubble with command options", async () => {
    const restartBubble = vi.fn(() =>
      Promise.resolve({
        bubbleId: "b_restart_02",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_02",
        worktreePath: "/tmp/worktree/b_restart_02",
        previousTmuxSessionExisted: true,
        previousRuntimeSessionRemoved: true
      } as unknown as RestartBubbleResult)
    );

    const result = await runBubbleRestartCommand(
      [
        "--id",
        "b_restart_02",
        "--repo",
        "/tmp/repo"
      ],
      "/tmp/cwd",
      {
        restartBubble
      }
    );

    expect(restartBubble).toHaveBeenCalledWith({
      bubbleId: "b_restart_02",
      repoPath: "/tmp/repo",
      cwd: "/tmp/cwd"
    });
    expect(result?.bubbleId).toBe("b_restart_02");
  });

  it("keeps top-level CLI wiring on the infrastructure-backed wrapper", async () => {
    const cliIndex = await readFile(resolve("src/cli/index.ts"), "utf8");
    const packageIndex = await readFile(resolve("src/index.ts"), "utf8");

    expect(cliIndex).toContain("from \"./commands/bubble/restart.js\"");
    expect(cliIndex).not.toContain(
      "from \"../v11/application/restart/restartCliCommand.js\""
    );
    expect(packageIndex).toContain("from \"./cli/commands/bubble/restart.js\"");
    expect(packageIndex).not.toContain(
      "from \"./v11/application/restart/restartCliCommand.js\""
    );
  });
});
