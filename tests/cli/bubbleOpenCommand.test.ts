import { describe, expect, it } from "vitest";

import {
  formatBubbleOpenResultText,
  getBubbleOpenHelpText,
  parseBubbleOpenCommandOptions,
  runBubbleOpenCommand
} from "../../src/cli/commands/bubble/open.js";

describe("parseBubbleOpenCommandOptions", () => {
  it("parses required and optional options", () => {
    const parsed = parseBubbleOpenCommandOptions([
      "--id",
      "b_open_01",
      "--repo",
      "/tmp/repo"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble open options");
    }

    expect(parsed.id).toBe("b_open_01");
    expect(parsed.repo).toBe("/tmp/repo");
  });

  it("supports help", () => {
    const parsed = parseBubbleOpenCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleOpenHelpText()).toContain("pairflow bubble open");
    expect(getBubbleOpenHelpText()).toContain("open_remote_command");
  });

  it("requires --id", () => {
    expect(() => parseBubbleOpenCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleOpenCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleOpenCommand(["--help"]);
    expect(result).toBeNull();
  });
});

describe("formatBubbleOpenResultText", () => {
  it("renders local worktree wording from the explicit workspace contract", () => {
    expect(
      formatBubbleOpenResultText({
        bubbleId: "b_open_cli_01",
        workspaceKind: "local_worktree",
        workspacePath: "/tmp/worktree",
        worktreePath: "/tmp/worktree",
        command: "cursor '/tmp/worktree'"
      })
    ).toBe("Opened bubble b_open_cli_01: worktree /tmp/worktree");
  });

  it("renders remote clone wording without implying a local worktree open", () => {
    expect(
      formatBubbleOpenResultText({
        bubbleId: "b_open_cli_02",
        workspaceKind: "remote_clone",
        workspacePath: "/srv/pairflow/repo--b_open_cli_02",
        remoteAuthority: "dev@ssh.example.com",
        command: "code --folder-uri 'vscode-remote://ssh-remote+dev%40ssh.example.com/srv/pairflow/repo--b_open_cli_02'"
      })
    ).toBe(
      "Opened bubble b_open_cli_02: remote clone authority=dev@ssh.example.com path=/srv/pairflow/repo--b_open_cli_02"
    );
  });
});
