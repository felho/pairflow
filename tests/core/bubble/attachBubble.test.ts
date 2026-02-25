import { describe, expect, it } from "vitest";

import { getBubblePaths } from "../../../src/core/bubble/paths.js";
import { attachBubble } from "../../../src/core/bubble/attachBubble.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";

function createResolvedBubbleFixture(input: {
  bubbleId: string;
  repoPath: string;
}) {
  const config: BubbleConfig = {
    id: input.bubbleId,
    repo_path: input.repoPath,
    base_branch: "main",
    bubble_branch: `bubble/${input.bubbleId}`,
    work_mode: "worktree",
    quality_mode: "strict",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    commit_requires_approval: true,
    agents: {
      implementer: "codex",
      reviewer: "claude"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: true
    }
  };

  return {
    bubbleId: input.bubbleId,
    bubbleConfig: config,
    bubblePaths: getBubblePaths(input.repoPath, input.bubbleId),
    repoPath: input.repoPath
  };
}

describe("attachBubble", () => {
  it("writes Warp launch YAML and executes open command when tmux session exists", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_01",
      repoPath: "/tmp/pairflow-attach-01"
    });

    let capturedYamlPath = "";
    let capturedYamlContent = "";
    let capturedCommand: { command: string; cwd: string } | undefined;

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: async () => true,
        writeYamlFile: async (path, content) => {
          capturedYamlPath = path;
          capturedYamlContent = content;
        },
        executeAttachCommand: (input) => {
          capturedCommand = input;
          return Promise.resolve({
            exitCode: 0,
            stdout: "",
            stderr: ""
          });
        }
      }
    );

    expect(result.bubbleId).toBe(resolved.bubbleId);
    expect(result.tmuxSessionName).toBe("pf-b_attach_01");

    expect(capturedYamlPath).toBe("/tmp/pairflow-attach-b_attach_01.yaml");
    expect(capturedYamlContent).toContain("tmux attach -t pf-b_attach_01");
    expect(capturedYamlContent).toContain(`cwd: "${resolved.repoPath}"`);
    expect(capturedYamlContent).toContain('name: "pf-b_attach_01"');

    expect(capturedCommand).toEqual({
      command: `open "warp://launch//tmp/pairflow-attach-b_attach_01.yaml"`,
      cwd: resolved.repoPath
    });
  });

  it("rejects when tmux session does not exist", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_02",
      repoPath: "/tmp/pairflow-attach-02"
    });

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: async () => false
        }
      )
    ).rejects.toThrow(/Tmux session .* does not exist/u);
  });

  it("surfaces attach command failure details", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_03",
      repoPath: "/tmp/pairflow-attach-03"
    });

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: async () => true,
          writeYamlFile: async () => {},
          executeAttachCommand: () =>
            Promise.resolve({
              exitCode: 1,
              stdout: "",
              stderr: "Warp not installed\n"
            })
        }
      )
    ).rejects.toThrow(/Warp not installed/u);
  });

  it("generates valid YAML structure", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_04",
      repoPath: "/tmp/pairflow-attach-04"
    });

    let capturedYaml = "";

    await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: async () => true,
        writeYamlFile: async (_path, content) => {
          capturedYaml = content;
        },
        executeAttachCommand: () =>
          Promise.resolve({ exitCode: 0, stdout: "", stderr: "" })
      }
    );

    const lines = capturedYaml.split("\n");
    expect(lines[0]).toBe("---");
    expect(capturedYaml).toContain("windows:");
    expect(capturedYaml).toContain("tabs:");
    expect(capturedYaml).toContain("layout:");
    expect(capturedYaml).toContain("commands:");
  });
});
